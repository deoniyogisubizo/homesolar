"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

type NewsletterCopy = {
  placeholder: string;
  button: string;
  success: string;
  error: string;
};

export function NewsletterForm({ copy }: { copy: NewsletterCopy }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? copy.error);
        return;
      }

      setStatus("success");
      setMessage(data.message ?? copy.success);
      setEmail("");
    } catch {
      setStatus("error");
      setMessage(copy.error);
    }
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="mt-6 flex w-full max-w-[510px] items-center gap-2 rounded-full bg-brand-pale p-1.5">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          className="h-11 min-w-0 flex-1 rounded-full bg-transparent px-5 text-[13px] text-navy outline-none placeholder:text-navy/50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy shadow-[0_4px_16px_rgba(1,38,78,0.08)] transition-colors hover:bg-navy hover:text-white disabled:opacity-70"
        >
          {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {copy.button}
        </button>
      </form>
      <p
        aria-live="polite"
        className={`mt-3 min-h-5 text-[12px] ${status === "error" ? "text-red-600" : "text-navy/75"}`}
      >
        {message}
      </p>
    </div>
  );
}
