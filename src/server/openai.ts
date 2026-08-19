import OpenAI from "openai";
import { env } from "~/env.mjs";
import { escapeRegExp } from "~/utils/utils";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  // 中转站对 OpenAI/JS UA 的请求有限制（路由到耗尽渠道），覆盖为自定义 UA
  defaultHeaders: { "User-Agent": "rapidpages/0.1" },
});
const openaiModelName = process.env.OPENAI_MODEL || "gpt-4-0613";

// 中转站渠道按模型区分且负载波动：主模型不可用（503/502 账户耗尽）时自动切换备用模型
const MODEL_FALLBACKS = [
  "claude-sonnet-4-6",
  "claude-sonnet-5",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-6",
];

async function chatWithFallback(
  params: Omit<Parameters<typeof openai.chat.completions.create>[0], "model">,
) {
  const models = [
    openaiModelName,
    ...MODEL_FALLBACKS.filter((m) => m !== openaiModelName),
  ];
  let lastError: unknown;
  for (const model of models) {
    try {
      return await openai.chat.completions.create({ ...params, model });
    } catch (err) {
      const status = (err as { status?: number }).status;
      // 仅对"账户耗尽/上游失败"降级；其他错误（参数错误等）直接抛出
      if (status !== 503 && status !== 502) throw err;
      lastError = err;
      console.warn(`模型 ${model} 暂不可用 (${status})，切换备用模型...`);
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw lastError;
}

const extractFirstCodeBlock = (input: string) => {
  const pattern = /```(\w+)?\n([\s\S]+?)\n```/g;
  let matches;
  while ((matches = pattern.exec(input)) !== null) {
    const language = matches[1];
    const codeBlock = matches[2];
    if (language === undefined || language === "tsx" || language === "jsx" || language === "json") {
      return codeBlock as string;
    }
  }

  // 兜底：模型没按代码块格式输出，但内容本身就是代码 → 直接使用
  let trimmed = input.trim();
  // 去掉残留的代码围栏（模型可能只开了 ```tsx 没闭合）
  trimmed = trimmed.replace(/^```(?:tsx|jsx|ts|js)?\s*\n?/, "");
  trimmed = trimmed.replace(/\n?```\s*$/, "");
  if (/import |export |function |const \w+ = |return \(/.test(trimmed)) {
    return trimmed;
  }
  throw new Error("No code block found in input");
};

const containsDiff = (message: string) => {
  return (
    message.includes("<<<<<<< ORIGINAL") &&
    message.includes(">>>>>>> UPDATED") &&
    message.includes("=======\n")
  );
};

const applyDiff = (code: string, diff: string) => {
  const regex = /<<<<<<< ORIGINAL\n(.*?)=======\n(.*?)>>>>>>> UPDATED/gs;

  let match;

  // debugger;
  while ((match = regex.exec(diff)) !== null) {
    const [, before, after] = match;

    // Convert match to a regex. We need to do this because
    // gpt returns the code with the tabs removed. The idea here is to
    // convert newlines to \s+ so that we catch even if the indentation
    // is different.
    // TODO: Before we replace, we can also check how indented the code is
    // and add the same indentation to the replacement.
    let regex = escapeRegExp(before!);
    regex = regex.replaceAll(/\r?\n/g, "\\s+");
    regex = regex.replaceAll(/\t/g, "");

    // Create the regex
    const replaceRegex = new RegExp(regex);

    // console.log(`Replacing $$$${replaceRegex}$$$ with $$$${after}$$$`);
    // console.log(`Code before: ${code}`);

    code = code.replace(replaceRegex, after!);
  }

  return code;
};

export async function reviseComponent(prompt: string, code: string) {
  const completion = await chatWithFallback({
    messages: [
      {
        role: "system",
        content: [
          "You are an AI programming assistant.",
          "Follow the user's requirements carefully & to the letter.",
          "You're working on a react component using typescript and tailwind.",
          "Don't introduce any new components or files.",
          "First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.",
          "You must format every code change with an *edit block* like this:",
          "```",
          "<<<<<<< ORIGINAL",
          "    # some comment",
          "    # Func to multiply",
          "    def mul(a,b)",
          "=======",
          "    # updated comment",
          "    # Function to add",
          "    def add(a,b):",
          ">>>>>>> UPDATED",
          "```",
          "There can be multiple code changes.",
          "Modify as few characters as possible and use as few characters as possible on the diff.",
          "Minimize any other prose.",
          "Keep your answers short and impersonal.",
          "Never create a new component or file.",
          `Always give answers by modifying the following code:\n\`\`\`tsx\n${code}\n\`\`\``,
        ].join("\n"),
      },
      {
        role: "user",
        content: `${prompt}`,
      },
    ],
    temperature: 0,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000,
    n: 1,
  });

  const choices = completion.choices;

  if (
    !choices ||
    choices.length === 0 ||
    !choices[0] ||
    !choices[0].message ||
    !choices[0].message.content
  ) {
    throw new Error("No choices returned from OpenAI");
  }

  const diff = choices[0].message.content;

  if (!containsDiff(diff)) {
    throw new Error("No diff found in message");
  }

  const newCode = applyDiff(code, diff);

  return newCode;
}

export async function generateNewComponent(prompt: string) {
  const completion = await chatWithFallback({
    messages: [
      {
        role: "system",
        content: [
          "You are a helpful assistant.",
          "You're tasked with writing a react component using typescript and tailwind for a website.",
          "Only import React as a dependency.",
          "Be concise and only reply with code.",
          "Wrap the component code in a single \`\`\`tsx ... \`\`\` block. No other text.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `- Component Name: Section`,
          `- Component Description: ${prompt}\n`,
          `- Do not use libraries or imports other than React.`,
          `- Do not have any dynamic data. Use placeholders as data. Do not use props.`,
          `- Write only a single component.`,
        ].join("\n"),
      },
    ],
    temperature: 0,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000,
    n: 1,
  });

  const choices = completion.choices;

  if (!choices || choices.length === 0 || !choices[0] || !choices[0].message) {
    throw new Error("No choices returned from OpenAI");
  }

  let result = choices[0].message.content || "";
  result = extractFirstCodeBlock(result);

  // console.log(result);
  return result;
}
