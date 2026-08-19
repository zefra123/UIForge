import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { generateNewComponent, reviseComponent } from "~/server/openai";

// ---------------------------------------------------------------------------
// 权限模型（无登录环境下的归属隔离）
// - 登录用户：actorId = 用户 id
// - 匿名用户：actorId = "anon:" + clientId（前端从 localStorage 生成，header 携带）
// - 只有组件归属者（authorId === actorId）才能修改/复制；匿名仅能浏览 PUBLIC 组件
// ---------------------------------------------------------------------------
type RouterCtx = { session?: { user?: { id?: string } | null } | null; clientId?: string | null };

const getActorId = (ctx: RouterCtx): string | null =>
  ctx.session?.user?.id ?? (ctx.clientId ? "anon:" + ctx.clientId : null);

// 匿名用户首次操作时，创建对应的 User 记录（Component.authorId 是外键，必须指向存在的 User）
async function ensureActor(ctx: RouterCtx & { db: typeof import("~/server/db").db }) {
  const actorId = getActorId(ctx);
  if (!actorId) return null;
  if (actorId.startsWith("anon:")) {
    await ctx.db.user.upsert({
      where: { id: actorId },
      create: {
        id: actorId,
        name: "匿名-" + actorId.slice(5, 10),
      },
      update: {},
    });
  }
  return actorId;
}

// ---------------------------------------------------------------------------
// 简单内存限流（生产应换 Redis/持久化；这里按 clientId 限流防刷额度）
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string | null, limit = 12, windowMs = 60_000) {
  if (!key) return;
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "请求过于频繁，请稍后再试",
    });
  }
}

// 查询 revision 时统一限制数量并排序（防止数据膨胀导致性能问题）
const REVISION_TAKE = 50;

export const componentRouter = createTRPCRouter({
  createComponent: publicProcedure
    .input(z.string().min(1).max(2000))
    .mutation(async ({ ctx, input }) => {
      const actorId = await ensureActor(ctx);
      checkRateLimit(ctx.clientId);

      let result: string;
      try {
        result = await generateNewComponent(input);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI 服务暂时繁忙，请稍后重试",
        });
      }

      const component = await ctx.db.component.create({
        data: {
          code: result,
          authorId: actorId,
          prompt: input,
          revisions: {
            create: {
              code: result,
              prompt: input,
            },
          },
        },
      });

      if (!component) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "组件创建失败",
        });
      }

      return {
        status: "success",
        data: {
          componentId: component.id,
        },
      };
    }),
  makeRevision: publicProcedure
    .input(
      z.object({
        revisionId: z.string().min(1).max(100),
        prompt: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = getActorId(ctx);
      if (!actorId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "请先创建自己的组件后再修改" });
      }
      checkRateLimit(ctx.clientId);

      const baseRevision = await ctx.db.componentRevision.findFirst({
        where: {
          id: input.revisionId,
          component: {
            authorId: actorId, // 只能修改自己的组件
          },
        },
      });

      if (!baseRevision) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "未找到组件或没有权限",
        });
      }

      let result: string;
      try {
        result = await reviseComponent(input.prompt, baseRevision.code);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI 服务暂时繁忙，请稍后重试",
        });
      }

      const newRevision = await ctx.db.componentRevision.create({
        data: {
          code: result,
          prompt: input.prompt,
          componentId: baseRevision.componentId,
        },
      });

      const updatedComponent = await ctx.db.component.update({
        where: {
          id: baseRevision.componentId,
        },
        data: {
          code: result,
          prompt: input.prompt,
          revisions: {
            connect: {
              id: newRevision.id,
            },
          },
        },
      });

      if (!newRevision || !updatedComponent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "版本创建失败",
        });
      }

      return {
        status: "success",
        data: {
          revisionId: newRevision.id,
        },
      };
    }),
  forkRevision: publicProcedure
    .input(
      z.object({
        revisionId: z.string().min(1).max(100),
        includePrevious: z.boolean().default(false).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { revisionId, includePrevious } = input;
      const actorId = await ensureActor(ctx);
      if (!actorId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "请先创建自己的组件后再复制" });
      }
      checkRateLimit(ctx.clientId);

      const component = await ctx.db.component.findFirst({
        where: {
          revisions: {
            some: {
              id: revisionId,
            },
          },
        },
        include: {
          revisions: {
            orderBy: { createdAt: "asc" },
            take: REVISION_TAKE,
          },
        },
      });

      const revisionIndex = component?.revisions.findIndex(
        (rev) => rev.id === revisionId,
      );
      if (!component || revisionIndex === undefined || revisionIndex === -1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "未找到版本",
        });
      }

      // 权限：PRIVATE 只能本人复制；PUBLIC 可复制
      if (
        component.authorId !== actorId &&
        component.visibility === "PRIVATE"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "没有权限复制该版本",
        });
      }

      const revisions = (
        includePrevious
          ? component.revisions.slice(0, revisionIndex)
          : [component.revisions[revisionIndex]]
      )
        .filter((rev): rev is NonNullable<typeof rev> => rev !== undefined)
        .map(({ code, prompt }) => ({ code, prompt }));

      if (revisions.length < 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "未找到版本",
        });
      }

      const newComponent = await ctx.db.component.create({
        data: {
          code: revisions[0]!.code,
          authorId: actorId,
          prompt: revisions[0]!.prompt,
          revisions: {
            create: revisions,
          },
        },
        include: {
          revisions: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!newComponent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "组件创建失败",
        });
      }

      // 返回目标 revision：不包含历史时新组件只有一个 revision；包含历史时返回最后创建的（目标）
      const targetRevision = includePrevious
        ? newComponent.revisions[newComponent.revisions.length - 1]
        : newComponent.revisions[0];
      if (!targetRevision) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "版本创建失败",
        });
      }

      return {
        status: "success",
        data: {
          revisionId: targetRevision.id,
        },
      };
    }),
  getComponent: publicProcedure
    .input(z.string().min(1).max(100))
    .query(async ({ ctx, input }) => {
      const actorId = getActorId(ctx);
      const component = await ctx.db.component.findFirst({
        where: {
          id: input,
        },
        include: {
          revisions: {
            orderBy: { createdAt: "asc" },
            take: REVISION_TAKE,
          },
        },
      });

      if (!component) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "未找到组件",
        });
      }

      // 私有组件仅归属者可查看
      if (component.authorId !== actorId && component.visibility === "PRIVATE") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "无权访问该组件" });
      }

      return component;
    }),
  getComponentFromRevision: publicProcedure
    .input(z.string().min(1).max(100))
    .query(async ({ ctx, input }) => {
      const actorId = getActorId(ctx);
      const component = await ctx.db.component.findFirst({
        where: {
          revisions: {
            some: {
              id: input,
            },
          },
        },
        include: {
          revisions: {
            orderBy: { createdAt: "asc" },
            take: REVISION_TAKE,
          },
        },
      });

      if (!component) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "未找到组件",
        });
      }

      if (component.authorId !== actorId && component.visibility === "PRIVATE") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "无权访问该组件" });
      }

      return component;
    }),
  getMyComponents: publicProcedure
    .input(
      z.object({
        pageIndex: z.number().min(0).max(10000).default(0),
        pageSize: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const actorId = getActorId(ctx);

      // 匿名：只能看公开组件；登录/匿名归属者：看自己的
      const where = actorId
        ? { authorId: actorId }
        : { visibility: "PUBLIC" };

      const componentCount = await ctx.db.component.count({ where });

      const components = await ctx.db.component.findMany({
        where,
        include: {
          revisions: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        take: input.pageSize,
        skip: input.pageSize * input.pageIndex,
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        status: "success",
        data: {
          rows: components,
          pageCount: Math.ceil(componentCount / input.pageSize),
        },
      };
    }),
});

/**
 * 组件导入路由：仅允许带身份（登录或匿名标识）的用户导入，且限流。
 */
export const componentImportRouter = createTRPCRouter({
  importComponent: publicProcedure
    .input(
      z.object({
        code: z.string().min(1).max(50000),
        description: z.string().max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actorId = await ensureActor(ctx);
      if (!actorId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "请先创建自己的组件" });
      }
      checkRateLimit(ctx.clientId, 5);

      const { code, description } = input;

      if (!code.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "无效的代码片段",
        });
      }

      const component = await ctx.db.component.create({
        data: {
          code,
          authorId: actorId,
          prompt: description,
          revisions: {
            create: {
              code,
              prompt: description,
            },
          },
        },
      });

      if (!component) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "组件创建失败",
        });
      }

      return {
        status: "success",
        data: {
          componentId: component.id,
        },
      };
    }),
});
