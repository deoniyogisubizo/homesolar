import { Schema, model, models, type Model } from "mongoose";

export type SearchSynonymDocument = {
  term: string;
  synonyms: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const searchSynonymSchema = new Schema<SearchSynonymDocument>(
  {
    term: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    synonyms: { type: [String], default: [], index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const SearchSynonym: Model<SearchSynonymDocument> =
  models.SearchSynonym || model<SearchSynonymDocument>("SearchSynonym", searchSynonymSchema);