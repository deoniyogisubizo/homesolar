"use client";

import { Loader2 } from "lucide-react";

export function SubmitButton({
  children,
  pending,
  variant = "primary",
  className = "",
  type = "submit",
  onClick,
  disabled,
  name,
  value,
}: {
  children: React.ReactNode;
  pending?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const styles = {
    primary: "bg-navy text-white hover:bg-navy-deep border-navy",
    secondary: "bg-white text-ink hover:bg-tile border-admin-line",
    danger: "bg-danger text-white hover:bg-danger/90 border-danger",
    ghost: "bg-transparent text-ink hover:bg-tile border-transparent",
  } as const;

  return (
    <button
      type={type}
      name={name}
      value={value}
      onClick={onClick}
      disabled={disabled || pending}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border px-3.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${styles[variant]} ${className}`}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
