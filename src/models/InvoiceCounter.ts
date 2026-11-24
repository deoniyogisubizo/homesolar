import { Schema, model, models, type Model } from "mongoose";

export type InvoiceCounterDocument = {
  prefix: string;
  seq: number;
};

const invoiceCounterSchema = new Schema<InvoiceCounterDocument>(
  {
    prefix: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const InvoiceCounter: Model<InvoiceCounterDocument> =
  models.InvoiceCounter || model<InvoiceCounterDocument>("InvoiceCounter", invoiceCounterSchema);
