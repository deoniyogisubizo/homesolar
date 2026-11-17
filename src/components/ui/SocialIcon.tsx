import type { SocialLink } from "@/types";

type SocialIconProps = {
  platform: SocialLink["platform"];
  className?: string;
};

export function SocialIcon({ platform, className = "h-4 w-4" }: SocialIconProps) {
  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M14.5 8.5V6.8c0-.8.5-1 1.1-1h2.1V2.1C17.3 2 16.3 2 15.2 2c-2.6 0-4.3 1.6-4.3 4.4v2.1H7.4v3.3h3.5V22h3.6v-10.2h3l.5-3.3h-3.5z" />
      </svg>
    );
  }

  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (platform === "twitter") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M18.2 3h3.4l-7.5 8.6L23 21h-6.9l-4.9-6.4L5.5 21H2.1l8-9.2L1.5 3h7.1l4.4 5.8L18.2 3zm-1.2 16.1h1.9L7.2 5H5.2l11.8 14.1z" />
      </svg>
    );
  }

  if (platform === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M6.5 8.3H2.8V21h3.7V8.3zM4.7 2.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM21.2 13.8c0-3.8-2-5.6-4.7-5.6-2.2 0-3.2 1.2-3.7 2V8.3H9.1V21h3.7v-7.1c0-1.9.4-3.7 2.7-3.7 2.2 0 2.2 2.1 2.2 3.8v7h3.5v-7.2z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.8 12 4.8 12 4.8s-5.8 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.8.4 7.6.4 7.6.4s5.8 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8zM10 15.2V8.8l5.4 3.2-5.4 3.2z" />
    </svg>
  );
}
