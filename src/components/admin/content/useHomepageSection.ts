"use client";

import { saveHomepageSectionAction } from "@/app/(admin)/admin/(dashboard)/storefront/actions";
import { useSectionForm } from "@/components/admin/settings/SettingsForm";
import type { HomepageSectionKey } from "@/schemas/content";

export function useHomepageSection<T>(section: HomepageSectionKey, initial: T) {
  return useSectionForm(initial, (value) =>
    saveHomepageSectionAction({ section, value }),
  );
}
