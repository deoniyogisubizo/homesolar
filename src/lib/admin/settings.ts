import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connectToDatabase } from "@/lib/mongodb";
import { Setting } from "@/models/Setting";
import {
  DEFAULT_SETTINGS,
  type SettingsMap,
  type SmtpSettings,
} from "@/lib/admin/settings-defaults";

type SettingKey = keyof SettingsMap;

function mergeSection(key: SettingKey, stored: unknown): unknown {
  const fallback = DEFAULT_SETTINGS[key] as Record<string, unknown>;
  if (!stored || typeof stored !== "object") return fallback;

  const value = stored as Record<string, unknown>;
  const merged = { ...fallback };

  for (const keyName of Object.keys(fallback)) {
    const incoming = value[keyName];
    if (incoming === undefined || incoming === null) continue;
    if (Array.isArray(incoming)) {
      merged[keyName] = incoming;
      continue;
    }
    if (typeof incoming === "object") {
      merged[keyName] = { ...(fallback[keyName] as object), ...(incoming as object) };
      continue;
    }
    merged[keyName] = incoming;
  }

  return merged;
}

export async function getSettings(): Promise<SettingsMap> {
  "use cache";
  cacheLife("minutes");
  cacheTag("settings");

  await connectToDatabase();
  const documents = await Setting.find({
    key: { $in: Object.keys(DEFAULT_SETTINGS) },
  }).lean();

  const stored = new Map(documents.map((document) => [document.key, document.value]));
  const settings: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    settings[key] = mergeSection(key, stored.get(key));
  }
  return settings as SettingsMap;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsMap[K]> {
  const settings = await getSettings();
  return settings[key];
}

export function publicSmtpSettings(settings: SmtpSettings) {
  return {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    username: settings.username,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    replyTo: settings.replyTo,
    hasPassword: Boolean(settings.passwordEncrypted),
  };
}

export function socialsForStorefront(socials: SettingsMap["contact"]["socials"]) {
  return socials.map((social) => ({
    platform: social.platform,
    label: social.label || social.platform,
    href: social.href || "#",
  }));
}
