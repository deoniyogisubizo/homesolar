import "server-only";

import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";

function getAdminSecret(): Uint8Array {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function getCustomerSecret(): Uint8Array {
  const secret = process.env.CUSTOMER_APP_SECRET ?? process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("CUSTOMER_APP_SECRET or APP_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

interface AdminTokenPayload {
  uid: string;
  role: string;
  sv: number;
  exp: number;
}

interface CustomerTokenPayload {
  uid: string;
  sv: number;
  exp: number;
}

export async function createAdminToken(payload: AdminTokenPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(payload.exp)
    .sign(getAdminSecret());
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAdminSecret());
    return payload as unknown as AdminTokenPayload;
  } catch {
    return null;
  }
}

export async function createCustomerToken(payload: CustomerTokenPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(payload.exp)
    .sign(getCustomerSecret());
}

export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getCustomerSecret());
    return payload as unknown as CustomerTokenPayload;
  } catch {
    return null;
  }
}