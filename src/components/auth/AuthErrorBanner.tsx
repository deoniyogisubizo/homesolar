type AuthErrorBannerProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Friendly copy for the error codes Auth.js can send back to the app. */
const MESSAGES: Record<string, string> = {
  AccountBlocked: "Your account has been blocked. Please contact support for help.",
  AccountSetupFailed: "We could not finish setting up your account. Please try again.",
  OAuthAccountNotLinked:
    "This email is already registered with a password. Sign in with your password to link Google.",
  AccessDenied: "Google sign-in was cancelled or declined.",
  OAuthCallback: "We could not complete the Google sign-in. Please try again.",
  Configuration: "Sign-in is misconfigured on the server. Please contact support.",
  Verification: "That sign-in link has expired. Please try again.",
};

const DEFAULT_MESSAGE = "Something went wrong during sign-in. Please try again.";

export async function AuthErrorBanner({ searchParams }: AuthErrorBannerProps) {
  const params = await searchParams;
  const raw = params.error;
  const code = (Array.isArray(raw) ? raw[0] : raw)?.trim();

  if (!code) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-[10px] border border-danger/20 bg-danger-pale px-4 py-3 text-[13px] leading-5 text-danger"
    >
      {MESSAGES[code] ?? DEFAULT_MESSAGE}
    </div>
  );
}
