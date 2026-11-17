import { Schema, model, models, type Model, type Types } from "mongoose";
import bcrypt from "bcryptjs";

export type CustomerAddress = {
  _id?: Types.ObjectId;
  label: string;
  /** House/plot number and street name, when available. */
  line1: string;
  province: string;
  district: string;
  sector: string;
  /** Main public place near the home, used by couriers to find it. */
  landmark: string;
  phone: string;
  isDefault: boolean;
};

export type CustomerNote = {
  body: string;
  by: string;
  at: Date;
};

export type CustomerDocument = {
  name: string;
  email: string;
  phone: string;
  passwordHash?: string;
  googleId?: string;
  /** Profile photo URL, populated from the Google account on first sign-in. */
  image?: string;
  blocked: boolean;
  addresses: CustomerAddress[];
  notes: CustomerNote[];
  orderCount: number;
  lifetimeValue: number;
  firstOrderAt?: Date | null;
  lastOrderAt?: Date | null;
  archivedAt?: Date | null;
  sessionVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
};

const addressSchema = new Schema<CustomerAddress>(
  {
    label: { type: String, default: "" },
    line1: { type: String, default: "" },
    province: { type: String, default: "" },
    district: { type: String, default: "" },
    sector: { type: String, default: "" },
    landmark: { type: String, default: "" },
    phone: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const noteSchema = new Schema<CustomerNote>(
  {
    body: { type: String, required: true },
    by: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const customerSchema = new Schema<CustomerDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    // Optional: Google-authenticated customers have no phone number on file.
    // They can add one later from the account profile page.
    phone: { type: String, default: "", trim: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, default: undefined, select: false },
    image: { type: String, default: "" },
    blocked: { type: Boolean, default: false, index: true },
    addresses: { type: [addressSchema], default: [] },
    notes: { type: [noteSchema], default: [] },
    orderCount: { type: Number, default: 0, min: 0 },
    lifetimeValue: { type: Number, default: 0, min: 0 },
    firstOrderAt: { type: Date, default: null },
    lastOrderAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

customerSchema.index({ email: 1 }, { unique: true, sparse: true });
customerSchema.index({ googleId: 1 }, { unique: true, sparse: true });
customerSchema.index({ phone: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ name: "text", email: "text", phone: "text" });

customerSchema.methods.verifyPassword = async function (password: string) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

customerSchema.methods.setPassword = async function (password: string) {
  this.passwordHash = await bcrypt.hash(password, 12);
};

export const Customer: Model<CustomerDocument> =
  models.Customer || model<CustomerDocument>("Customer", customerSchema);
