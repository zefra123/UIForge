import React from "react";

// UIForge Logo：渐变圆角方块 + U 形图标
interface LogoProps extends React.SVGProps<SVGSVGElement> {}

export const Logo = (props: LogoProps) => {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" {...props}>
      <defs>
        <linearGradient id="uiforge-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#uiforge-g)" />
      <path
        d="M9 23V14a4 4 0 0 1 8 0v9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 19h8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
};
