import "server-only";

import { connectToDatabase } from "@/lib/mongodb";
import { Location } from "@/models/Location";

export type DeliveryLocation = {
  name: string;
  province: string;
  sectors: string[];
};

export async function getDeliveryLocations(): Promise<DeliveryLocation[]> {
  await connectToDatabase();
  const locations = await Location.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  return locations.map((location) => ({
    name: location.name,
    province: location.province,
    sectors: location.sectors,
  }));
}

export async function findDeliveryLocation(name: string): Promise<DeliveryLocation | null> {
  await connectToDatabase();
  const location = await Location.findOne({ name: name.trim(), active: true }).lean();
  if (!location) return null;
  return {
    name: location.name,
    province: location.province,
    sectors: location.sectors,
  };
}
