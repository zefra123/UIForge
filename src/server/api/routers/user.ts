import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  // Deletes the user
  deleteUser: publicProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id ?? null;
    await ctx.db.user.delete({
      where: {
        id: userId,
      },
    });

    return {};
  }),
});
