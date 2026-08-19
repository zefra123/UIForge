import React from "react";
import { Logo } from "./Logo";

// UIForge 带文字 Logo
interface LogoLargeProps {
  textcolor?: string;
}

export const LogoLarge = ({ textcolor = "#111827" }: LogoLargeProps) => {
  return (
    <span className="inline-flex items-center gap-2">
      <Logo className="h-8 w-8" />
      <span className="text-lg font-bold tracking-tight" style={{ color: textcolor }}>
        UIForge
      </span>
    </span>
  );
};
