import { Schema, model, models, type Model } from "mongoose";

export type SettingDocument = {
  key: string;
  value: Record<string, unknown>;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const settingSchema = new Schema<SettingDocument>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const Setting: Model<SettingDocument> =
  models.Setting || model<SettingDocument>("Setting", settingSchema);
