import "server-only";

/**
 * Matches the sort of values that show up in a copied `.env.example`:
 * "your-google-client-id", "replace-me", "<client-id>", etc.
 */
const PLACEHOLDER_PATTERN = /^(your[-_ ]|replace[-_ ]|changeme|placeholder|xxx|<|\{\{|todo)/i;

/**
 * True when real Google OAuth credentials are present.
 *
 * Both the values themselves and their shape are checked: a Google web
 * client id always ends in `.apps.googleusercontent.com`. Without this guard
 * the app happily redirects to Google with a placeholder client id, and the
 * user lands on Google's "The OAuth client was not found — invalid_client"
 * error page with no clue what is wrong.
 */
export function isGoogleAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";

  if (!clientId || !clientSecret) return false;
  if (PLACEHOLDER_PATTERN.test(clientId) || PLACEHOLDER_PATTERN.test(clientSecret)) return false;
  if (!clientId.includes(".apps.googleusercontent.com")) return false;

  return true;
}
