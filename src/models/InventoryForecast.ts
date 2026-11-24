import { Schema, model, models, type Model, type Types } from "mongoose";

export type InventoryForecastDocument = {
  productId: Types.ObjectId;
  velocity7d: number;
  velocity14d: number;
  velocity30d: number;
  weightedVelocity: number;
  daysOfStockLeft: number;
  reorderPoint: number;
  suggestedReorderQty: number;
  supplierLeadDays: number;
  safetyStock: number;
  alert: boolean;
  computedAt: Date;
};

const inventoryForecastSchema = new Schema<InventoryForecastDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, unique: true, index: true },
    velocity7d: { type: Number, default: 0 },
    velocity14d: { type: Number, default: 0 },
    velocity30d: { type: Number, default: 0 },
    weightedVelocity: { type: Number, default: 0, index: true },
    daysOfStockLeft: { type: Number, default: 0, index: true },
    reorderPoint: { type: Number, default: 0 },
    suggestedReorderQty: { type: Number, default: 0 },
    supplierLeadDays: { type: Number, default: 14 },
    safetyStock: { type: Number, default: 7 },
    alert: { type: Boolean, default: false, index: true },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const InventoryForecast: Model<InventoryForecastDocument> =
  models.InventoryForecast || model<InventoryForecastDocument>("InventoryForecast", inventoryForecastSchema);