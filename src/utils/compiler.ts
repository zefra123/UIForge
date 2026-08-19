import { availablePresets, registerPreset, transform } from "@babel/standalone";
import {
  type TailwindConfig,
  createTailwindcss,
} from "@mhsdesign/jit-browser-tailwindcss";

registerPreset("tsx", {
  presets: [
    [availablePresets["typescript"], { allExtensions: true, isTSX: true }],
  ],
});

// 清理 AI 输出残留的代码围栏标记（防御：模型输出不规整时避免 Babel 解析反引号报错）
const stripCodeFences = (code: string): string => {
  let c = code.trim();
  c = c.replace(/^```(?:tsx|jsx|ts|js)?\s*\n?/, "");
  c = c.replace(/\n?```\s*$/, "");
  return c.trim();
};

export const compileTypescript = async (rawCode: string) => {
  const code = stripCodeFences(rawCode);
  const compiledComponent = babelCompile(code, `Section.tsx`);

  const app = `
      import React, { useEffect } from 'react';
      import { createRoot } from 'react-dom';
      import Section from './Section.tsx';

      const App = () => {
        return (
          <>
            <Section />
          </>
        )
      }

      createRoot(document.querySelector("#root")).render(<App />)
    `;

  // Transform the code from TSX to JS
  const output = babelCompile(app, "index.tsx");

  // Have CSS generated from Tailwind
  const tailwindConfig: TailwindConfig = {
    theme: {
      extend: {
        colors: {},
      },
    },
    // plugins: [typography]
  };

  const tailwindCss = createTailwindcss({ tailwindConfig });

  const css = await tailwindCss.generateStylesFromContent(
    `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
    `,
    [compiledComponent.code, output.code],
  );

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <style>${css}</style>
    </head>
    <body style="background-color:#fff">
      <div id="root"></div>
      <script crossorigin defer src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
      <script crossorigin defer src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
      <script defer>window.addEventListener("DOMContentLoaded", () => {${[
        compiledComponent.code,
        output.code,
      ].join("\n")}});</script>
    </body>
  </html>
    `;

  return html;
};

// HTML 转义（错误信息安全显示）
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 编译失败时返回渲染错误信息的 HTML（不让页面白屏）
const errorHtml = (err: unknown) => `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><style>
    body { margin:0; font-family: system-ui, "Microsoft YaHei", sans-serif; background:#fef2f2; }
    .box { display:flex; min-height:100vh; align-items:center; justify-content:center; padding:24px; }
    .inner { max-width:640px; background:#fff; border:1px solid #fecaca; border-radius:12px; padding:24px; box-shadow:0 4px 12px rgba(0,0,0,.06); }
    h3 { margin:0 0 10px; color:#b91c1c; font-size:15px; }
    pre { margin:0; white-space:pre-wrap; word-break:break-word; font-size:12px; color:#7f1d1d; background:#fff7f7; border-radius:8px; padding:12px; max-height:60vh; overflow:auto; }
    .hint { margin-top:12px; font-size:12px; color:#9a3412; }
  </style></head>
  <body>
    <div class="box"><div class="inner">
      <h3>⚠️ 代码存在语法错误</h3>
      <pre>${escapeHtml(err instanceof Error ? err.message : String(err))}</pre>
      <p class="hint">这是 AI 生成的代码不完整导致的。你可以：返回首页重新生成，或在左侧「代码」标签中手动修正。</p>
    </div></div>
  </body>
</html>`;

// Transforms the TSX code to JS
const babelCompile = (code: string, filename: string) => {
  try {
    return transform(code, {
      filename: filename,
      plugins: [
        [
          "transform-modules-umd",
          {
            globals: { react: "React", "react-dom": "ReactDOM" },
          },
        ],
      ],
      presets: ["tsx", "react"],
    });
  } catch (err) {
    return { code: `document.body.innerHTML = ${JSON.stringify(errorHtml(err))};` };
  }
};