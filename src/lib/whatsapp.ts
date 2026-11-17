import "server-only";

import { normalizePhone } from "@/lib/whatsapp-core";

export * from "@/lib/whatsapp-core";

export async function getWhatsAppNumber(): Promise<string | null> {
  const { getSetting } = await import("@/lib/admin/settings");
  const contact = await getSetting("contact");
  return normalizePhone(contact.whatsappNumber);
}
