import Link from "next/link";
import Image from "next/image";

/** Master brand logo shipped in `public/logo`. */
const MASTER_LOGO = "/logo/Solar%20Home%20System%20%26%20Electronic%20Logo(2).png";

type Motivation = {
  heading: string;
  body: string;
};

type AuthShellProps = {
  brandName: string;
  /** Overrides the master logo from `public/logo`. */
  logo?: string;
  title: string;
  description: string;
  tagline?: string;
  motivation?: Motivation;
  /** Form card contents, rendered on the right-hand panel. */
  children: React.ReactNode;
};

const DEFAULT_MOTIVATION: Motivation = {
  heading: "Solar & Electronics Components",
  body: "We supply solar panels, inverters, batteries and the electronics accessories that tie them together — everything your home needs to run on clean, reliable power.",
};

/**
 * Split-screen shell for the auth pages: branding, copy and motivation on
 * the left, the form card on the right. The panels split the viewport 50/50
 * on large screens and stack on small ones.
 *
 * Note: globals.css declares unlayered `h1`/`p` base rules, and unlayered
 * declarations outrank Tailwind's layered font-size utilities. Sizes for
 * those elements are therefore applied on a nested <span>, which has no
 * base rule of its own.
 */
export function AuthShell({
  brandName,
  logo = MASTER_LOGO,
  title,
  description,
  tagline,
  motivation = DEFAULT_MOTIVATION,
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left panel: branding, copy and motivation */}
      <div className="relative flex w-full flex-col justify-center bg-[#222] px-8 py-14 text-white sm:px-12 lg:w-1/2 lg:px-16 lg:py-20">
        <div className="mx-auto w-full max-w-[420px]">
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-[12px] bg-white px-5 py-3.5"
            aria-label={brandName}
          >
            <Image
              src={logo}
              alt={brandName}
              width={2048}
              height={691}
              priority
              className="h-[46px] w-auto"
            />
          </Link>

          <h1 className="mt-11 text-white">{title}</h1>

          <p className="mt-4 max-w-[380px] text-white/75">
            <span className="text-[17px] leading-7">{description}</span>
          </p>

          <div className="mt-9 border-t border-white/15 pt-7">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/50">
              {motivation.heading}
            </div>
            <div className="mt-3 max-w-[360px] text-[14px] leading-6 text-white/70">
              {motivation.body}
            </div>
          </div>

          {tagline ? (
            <div className="mt-9 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-300">
              {tagline}
            </div>
          ) : null}
        </div>
      </div>

      {/* Right panel: form only */}
      <div className="relative flex w-full flex-1 items-center justify-center bg-canvas px-6 py-14 lg:w-1/2 lg:flex-none lg:px-12 lg:py-20">
        <div className="w-full max-w-[440px] rounded-[20px] border border-gray-200 bg-white p-8 shadow-2xl lg:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
