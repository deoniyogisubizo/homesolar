import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createOrUpdateCustomerFromGoogle, issueSessionCookie } from "@/lib/auth/customer";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.CUSTOMER_APP_SECRET ?? process.env.APP_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      if (!user.email) {
        return "/login?error=OAuthCallback";
      }

      // Google tells us whether it has verified the address. Never link an
      // unverified address to an existing customer account.
      if ((profile as { email_verified?: boolean } | undefined)?.email_verified === false) {
        return "/login?error=AccessDenied";
      }

      try {
        const customer = await createOrUpdateCustomerFromGoogle({
          googleId: account.providerAccountId,
          email: user.email,
          name: user.name ?? "",
          picture: user.image ?? undefined,
        });

        if (!customer) {
          return "/login?error=AccountSetupFailed";
        }

        if (customer.blocked) {
          return "/login?error=AccountBlocked";
        }

        await issueSessionCookie({
          id: String(customer._id),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          image: customer.image,
          sessionVersion: customer.sessionVersion,
        });
      } catch (error) {
        console.error("Google sign-in error:", error);
        return "/login?error=OAuthCallback";
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
});