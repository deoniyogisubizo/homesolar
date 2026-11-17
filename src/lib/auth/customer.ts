import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer, type CustomerDocument } from "@/models/Customer";
import { createCustomerToken, verifyCustomerToken } from "@/lib/auth/token";

export const CUSTOMER_COOKIE = "homesolar_customer";
const SESSION_DAYS = Number.parseInt(process.env.CUSTOMER_SESSION_DAYS ?? "30", 10);
const SESSION_SECONDS = (Number.isFinite(SESSION_DAYS) ? SESSION_DAYS : 30) * 86400;

export type CustomerSession = {
  id: string;
  name: string;
  email: string;
  phone: string;
  image?: string;
  sessionVersion: number;
};

function toSession(user: {
  _id: unknown;
  name: string;
  email: string;
  phone: string;
  image?: string;
  sessionVersion: number;
}): CustomerSession {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image || undefined,
    sessionVersion: user.sessionVersion,
  };
}

export async function issueSessionCookie(user: CustomerSession) {
  const token = await createCustomerToken({
    uid: user.id,
    sv: user.sessionVersion,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  });

  const store = await cookies();
  store.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(CUSTOMER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyCustomerToken(token);
  if (!payload) return null;

  await connectToDatabase();
  const user = await Customer.findOne({
    _id: payload.uid,
    sessionVersion: payload.sv,
  })
    .select("name email phone image sessionVersion blocked")
    .lean();

  if (user?.blocked) return null;

  if (!user) return null;
  return toSession(user as typeof user & { sessionVersion: number });
}

export async function requireCustomer(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) redirect("/login");
  return session;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

export async function findCustomerForLogin(email: string) {
  await connectToDatabase();
  return Customer.findOne({ email: email.toLowerCase() })
    .select("+passwordHash")
    .lean();
}

export async function findCustomerByGoogleId(googleId: string) {
  await connectToDatabase();
  return Customer.findOne({ googleId }).lean();
}

export async function createCustomerWithPassword(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  await connectToDatabase();
  
  const existing = await Customer.findOne({ email: data.email.toLowerCase() }).lean();
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(data.password);
  const sessionVersion = 1;

  const customer = await Customer.create({
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone,
    passwordHash,
    sessionVersion,
  });

  return customer;
}

type GoogleCustomerProfile = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
};

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

/**
 * Creates or updates the customer record for a Google sign-in.
 *
 * - A returning Google user is matched by the stable Google subject id.
 * - A first Google sign-in on an existing email account links Google to that
 *   account so orders, addresses and wishlist are kept.
 * - If the email is already linked to a different Google identity, the login
 *   is refused instead of silently taking over the account.
 */
export async function createOrUpdateCustomerFromGoogle(data: GoogleCustomerProfile) {
  await connectToDatabase();

  const googleId = data.googleId.trim();
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim() || email.split("@")[0] || "Customer";

  if (!googleId || !email) return null;

  const profileFields = {
    name,
    email,
    ...(data.picture ? { image: data.picture } : {}),
  };

  // 1. Returning Google customer.
  const customerByGoogleId = await Customer.findOne({ googleId }).lean();
  if (customerByGoogleId) {
    return Customer.findByIdAndUpdate(
      customerByGoogleId._id,
      { $set: profileFields },
      { new: true, runValidators: true },
    ).lean();
  }

  // 2. Existing email/password account: link Google to it. The Google id is
  //    selected explicitly because the schema hides it by default.
  const customerByEmail = await Customer.findOne({ email }).select("+googleId").lean();
  if (customerByEmail) {
    if (customerByEmail.googleId && customerByEmail.googleId !== googleId) {
      return null;
    }

    return Customer.findByIdAndUpdate(
      customerByEmail._id,
      { $set: { ...profileFields, googleId } },
      { new: true, runValidators: true },
    ).lean();
  }

  // 3. Brand-new customer.
  try {
    const customer = await Customer.create({
      ...profileFields,
      phone: "",
      googleId,
      sessionVersion: 1,
    });

    return customer.toObject();
  } catch (error) {
    // Two simultaneous first sign-ins can race past the checks above.
    if (isDuplicateKeyError(error)) {
      return Customer.findOne({ googleId }).lean();
    }
    throw error;
  }
}

export function publicCustomer(user: CustomerDocument & { _id: unknown }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image || null,
    blocked: user.blocked,
    orderCount: user.orderCount,
    lifetimeValue: user.lifetimeValue,
    createdAt: user.createdAt?.toISOString() ?? null,
  };
}