import { Types, PipelineStage } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { PopularityScore } from "@/models/PopularityScore";
import { SearchSynonym } from "@/models/SearchSynonym";
import { Event } from "@/models/Event";
import { COMMERCE_CONFIG } from "@/lib/commerce-config";

const { search } = COMMERCE_CONFIG;

interface SearchResult {
  productId: Types.ObjectId;
  score: number;
  textRelevance: number;
  popularityScore: number;
  inStock: number;
  recency: number;
}

function expandQueryWithSynonyms(query: string, synonyms: Map<string, string[]>): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = new Set<string>(terms);

  for (const term of terms) {
    const syns = synonyms.get(term);
    if (syns) {
      for (const syn of syns) expanded.add(syn);
    }
  }

  return Array.from(expanded);
}

async function getActiveSynonyms(): Promise<Map<string, string[]>> {
  await connectToDatabase();
  const synonyms = await SearchSynonym.find({ active: true }).lean();
  const map = new Map<string, string[]>();
  for (const s of synonyms) {
    map.set(s.term, s.synonyms);
  }
  return map;
}

export async function searchProducts(query: string, limit: number = search.maxResults): Promise<SearchResult[]> {
  await connectToDatabase();

  const trimmed = query.trim();
  if (trimmed.length < search.minQueryLength) return [];

  const synonyms = await getActiveSynonyms();
  const expandedTerms = expandQueryWithSynonyms(trimmed, synonyms);
  const searchQuery = expandedTerms.join(" ");

  let results: SearchResult[] = [];

  try {
    results = await atlasSearch(searchQuery, limit);
  } catch {
    results = await textSearchFallback(searchQuery, limit);
  }

  await logSearchQuery(trimmed, results.length);

  return results;
}

async function atlasSearch(query: string, limit: number): Promise<SearchResult[]> {
  const pipeline: PipelineStage[] = [
    {
      $search: {
        index: "products_search",
        compound: {
          should: [
            {
              autocomplete: {
                query,
                path: "name",
                tokenOrder: "sequential",
                score: { boost: { value: 3 } },
              },
            },
            {
              text: {
                query,
                path: ["name", "description", "shortDescription", "tags", "brand"],
                fuzzy: { maxEdits: search.fuzzyMaxEdits },
                score: { boost: { value: 1 } },
              },
            },
          ],
        },
      },
    },
    { $match: { publishStatus: "active" } },
    {
      $lookup: {
        from: "popularityscores",
        localField: "_id",
        foreignField: "productId",
        as: "popularity",
      },
    },
    { $unwind: { path: "$popularity", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        textRelevance: { $meta: "searchScore" },
        popularityScore: { $ifNull: ["$popularity.score", 0] },
        inStock: { $cond: [{ $gt: ["$stock", 0] }, 1, 0] },
        recency: {
          $divide: [
            { $subtract: [new Date(), "$createdAt"] },
            1000 * 60 * 60 * 24 * 30,
          ],
        },
      },
    },
    {
      $addFields: {
        finalScore: {
          $add: [
            { $multiply: ["$textRelevance", search.textRelevanceWeight] },
            { $multiply: ["$popularityScore", search.popularityWeight] },
            { $multiply: ["$inStock", search.inStockWeight] },
            { $multiply: [{ $subtract: [1, { $min: ["$recency", 1] }] }, search.recencyWeight] },
          ],
        },
      },
    },
    { $sort: { inStock: -1, finalScore: -1 } },
    { $limit: limit },
    {
      $project: {
        productId: "$_id",
        score: "$finalScore",
        textRelevance: 1,
        popularityScore: 1,
        inStock: 1,
        recency: 1,
        _id: 0,
      },
    },
  ];

  const results = await Product.aggregate<SearchResult>(pipeline).exec();
  return results;
}

async function textSearchFallback(query: string, limit: number): Promise<SearchResult[]> {
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pipeline: PipelineStage[] = [
    {
      $match: {
        publishStatus: "active",
        $text: { $search: escapedQuery },
      },
    },
    {
      $addFields: {
        textRelevance: { $meta: "textScore" },
      },
    },
    {
      $lookup: {
        from: "popularityscores",
        localField: "_id",
        foreignField: "productId",
        as: "popularity",
      },
    },
    { $unwind: { path: "$popularity", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        popularityScore: { $ifNull: ["$popularity.score", 0] },
        inStock: { $cond: [{ $gt: ["$stock", 0] }, 1, 0] },
        recency: {
          $divide: [
            { $subtract: [new Date(), "$createdAt"] },
            1000 * 60 * 60 * 24 * 30,
          ],
        },
      },
    },
    {
      $addFields: {
        finalScore: {
          $add: [
            { $multiply: ["$textRelevance", search.textRelevanceWeight] },
            { $multiply: ["$popularityScore", search.popularityWeight] },
            { $multiply: ["$inStock", search.inStockWeight] },
            { $multiply: [{ $subtract: [1, { $min: ["$recency", 1] }] }, search.recencyWeight] },
          ],
        },
      },
    },
    { $sort: { inStock: -1, finalScore: -1 } },
    { $limit: limit },
    {
      $project: {
        productId: "$_id",
        score: "$finalScore",
        textRelevance: 1,
        popularityScore: 1,
        inStock: 1,
        recency: 1,
        _id: 0,
      },
    },
  ];

  const results = await Product.aggregate<SearchResult>(pipeline).exec();
  return results;
}

async function logSearchQuery(query: string, resultCount: number): Promise<void> {
  await connectToDatabase();
  await Event.create({
    type: "search",
    query,
    metadata: { resultCount },
    createdAt: new Date(),
  }).catch(() => {});
}

export async function getZeroResultQueries(limit = 50): Promise<Array<{ query: string; count: number; lastSearched: Date }>> {
  await connectToDatabase();

  const results = await Event.aggregate<{ query: string; count: number; lastSearched: Date }>([
    { $match: { type: "search", "metadata.resultCount": 0 } },
    {
      $group: {
        _id: "$query",
        count: { $sum: 1 },
        lastSearched: { $max: "$createdAt" },
      },
    },
    { $sort: { count: -1, lastSearched: -1 } },
    { $limit: limit },
    { $project: { query: "$_id", count: 1, lastSearched: 1, _id: 0 } },
  ]).exec();

  return results;
}