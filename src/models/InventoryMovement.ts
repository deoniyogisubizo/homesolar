import { Schema, model, models, type Model, type Types } from "mongoose";

export type InventoryMovementDocument = {
  productId: Types.ObjectId;
  variantSku?: string | null;
  delta: number;
  stockAfter: number;
  reason: string;
  note: string;
  actorId?: Types.ObjectId | null;
  actorEmail: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const inventoryMovementSchema = new Schema<InventoryMovementDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variantSku: { type: String, default: null },
    delta: { type: Number, required: true },
    stockAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    note: { type: String, default: "" },
    actorId: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    actorEmail: { type: String, required: true },
  },
  { timestamps: true },
);

inventoryMovementSchema.index({ createdAt: -1 });
inventoryMovementSchema.index({ productId: 1, createdAt: -1 });

export const InventoryMovement: Model<InventoryMovementDocument> =
  models.InventoryMovement ||
  model<InventoryMovementDocument>("InventoryMovement", inventoryMovementSchema);
