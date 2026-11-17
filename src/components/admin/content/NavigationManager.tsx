"use client";

import { ArrowDown, ArrowUp, ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import { saveNavigationAction } from "@/app/(admin)/admin/(dashboard)/storefront/actions";
import { Field, FieldGrid, FormSection } from "@/components/admin/FormSection";
import { SettingsSectionForm, fieldError, useSectionForm } from "@/components/admin/settings/SettingsForm";
import type { SiteContentData } from "@/types";

type NavigationValues = {
  nav: Array<{ label: string; href: string; children: Array<{ label: string; href: string }> }>;
  searchEnabled: boolean;
  searchPlaceholder: string;
  currency: string;
  currencies: string[];
  language: string;
  languages: string[];
};

function normalize(header: SiteContentData["header"]): NavigationValues {
  return {
    nav: header.nav.map((link) => ({
      label: link.label,
      href: link.href,
      children: (link.children ?? []).map((child) => ({ label: child.label, href: child.href })),
    })),
    searchEnabled: header.searchEnabled,
    searchPlaceholder: header.searchPlaceholder,
    currency: header.currency,
    currencies: header.currencies,
    language: header.language,
    languages: header.languages,
  };
}

function joinList(values: string[]) {
  return values.join(", ");
}

function splitList(value: string, upper = false) {
  return value
    .split(",")
    .map((entry) => {
      const trimmed = entry.trim();
      return upper ? trimmed.toUpperCase() : trimmed;
    })
    .filter(Boolean);
}

export function NavigationManager({ initial }: { initial: SiteContentData["header"] }) {
  const form = useSectionForm(normalize(initial), saveNavigationAction);
  const { value, setValue } = form;

  const updateLink = (index: number, patch: Partial<NavigationValues["nav"][number]>) => {
    setValue({ ...value, nav: value.nav.map((link, position) => (position === index ? { ...link, ...patch } : link)) });
  };

  const updateChild = (linkIndex: number, childIndex: number, patch: Partial<{ label: string; href: string }>) => {
    updateLink(linkIndex, {
      children: value.nav[linkIndex].children.map((child, position) =>
        position === childIndex ? { ...child, ...patch } : child,
      ),
    });
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.nav.length) return;
    const next = [...value.nav];
    [next[index], next[target]] = [next[target], next[index]];
    setValue({ ...value, nav: next });
  };

  return (
    <SettingsSectionForm form={form} label="Navigation changes are not saved yet.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <FormSection
            title="Main menu"
            description="Top-level links in the storefront header. Add dropdown links to turn an item into a menu."
            aside={
              value.nav.length < 16 ? (
                <button
                  type="button"
                  onClick={() => setValue({ ...value, nav: [...value.nav, { label: "", href: "/", children: [] }] })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add menu item
                </button>
              ) : null
            }
          >
            <div className="space-y-3">
              {value.nav.map((link, index) => (
                <div key={index} className="rounded-[6px] border border-admin-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-semibold text-ink">Menu item {index + 1}</p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveLink(index, -1)}
                        disabled={index === 0}
                        className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                        aria-label={`Move menu item ${index + 1} up`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLink(index, 1)}
                        disabled={index === value.nav.length - 1}
                        className="rounded-[4px] p-1 text-admin-muted hover:bg-tile hover:text-ink disabled:opacity-30"
                        aria-label={`Move menu item ${index + 1} down`}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue({ ...value, nav: value.nav.filter((_, position) => position !== index) })}
                        className="rounded-[4px] p-1 text-admin-muted hover:bg-danger-pale hover:text-danger"
                        aria-label={`Remove menu item ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <Field label="Label" htmlFor={`nav-label-${index}`} error={fieldError(form, `nav.${index}.label`)}>
                      <input
                        id={`nav-label-${index}`}
                        className="admin-field"
                        value={link.label}
                        onChange={(event) => updateLink(index, { label: event.target.value })}
                      />
                    </Field>
                    <Field label="Link" htmlFor={`nav-href-${index}`} error={fieldError(form, `nav.${index}.href`)}>
                      <input
                        id={`nav-href-${index}`}
                        className="admin-field"
                        value={link.href}
                        onChange={(event) => updateLink(index, { href: event.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-admin-muted">
                        <Link2 className="h-3 w-3" />
                        Dropdown links
                      </span>
                      {link.children.length < 20 ? (
                        <button
                          type="button"
                          onClick={() => updateLink(index, { children: [...link.children, { label: "", href: "/" }] })}
                          className="inline-flex h-7 items-center gap-1 rounded-[4px] px-2 text-[11px] font-medium text-brand-deep hover:bg-brand-pale"
                        >
                          <Plus className="h-3 w-3" />
                          Add dropdown link
                        </button>
                      ) : null}
                    </div>
                    {link.children.length ? (
                      <div className="mt-2 space-y-1.5 border-l-2 border-admin-line pl-3">
                        {link.children.map((child, childIndex) => (
                          <div key={childIndex} className="grid gap-1.5 sm:grid-cols-[1fr_1.3fr_32px]">
                            <input
                              className="admin-field h-8 text-[12px]"
                              aria-label={`Menu item ${index + 1} dropdown label ${childIndex + 1}`}
                              placeholder="Label"
                              value={child.label}
                              onChange={(event) => updateChild(index, childIndex, { label: event.target.value })}
                            />
                            <input
                              className="admin-field h-8 text-[12px]"
                              aria-label={`Menu item ${index + 1} dropdown link ${childIndex + 1}`}
                              placeholder="/about-us"
                              value={child.href}
                              onChange={(event) => updateChild(index, childIndex, { href: event.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateLink(index, {
                                  children: link.children.filter((_, position) => position !== childIndex),
                                })
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-[4px] text-admin-muted hover:bg-danger-pale hover:text-danger"
                              aria-label={`Remove dropdown link ${childIndex + 1}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-admin-muted">
                        No dropdown links. This item links directly to its URL.
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {!value.nav.length ? (
                <p className="rounded-[6px] border border-dashed border-admin-line px-3 py-4 text-center text-[12px] text-admin-muted">
                  No menu items. The header will show no primary navigation.
                </p>
              ) : null}
            </div>
            {fieldError(form, "nav") ? <p className="admin-error">{fieldError(form, "nav")}</p> : null}
          </FormSection>

          <FormSection title="Header utilities" description="Search visibility, display currency and language options.">
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={value.searchEnabled}
                onChange={(event) => setValue({ ...value, searchEnabled: event.target.checked })}
                className="h-4 w-4"
              />
              Show the product search box
            </label>
            <div className="mt-3">
              <FieldGrid>
                <Field label="Search placeholder" htmlFor="nav-search-placeholder">
                  <input
                    id="nav-search-placeholder"
                    className="admin-field"
                    value={value.searchPlaceholder}
                    onChange={(event) => setValue({ ...value, searchPlaceholder: event.target.value })}
                  />
                </Field>
                <Field label="Active currency" htmlFor="nav-currency" error={fieldError(form, "currency")}>
                  <input
                    id="nav-currency"
                    className="admin-field"
                    value={value.currency}
                    onChange={(event) => setValue({ ...value, currency: event.target.value.toUpperCase() })}
                  />
                </Field>
                <Field label="Currency options" htmlFor="nav-currencies" hint="Comma-separated three-letter codes.">
                  <input
                    id="nav-currencies"
                    className="admin-field"
                    value={joinList(value.currencies)}
                    onChange={(event) => setValue({ ...value, currencies: splitList(event.target.value, true) })}
                  />
                </Field>
                <Field label="Active language" htmlFor="nav-language" error={fieldError(form, "language")}>
                  <input
                    id="nav-language"
                    className="admin-field"
                    value={value.language}
                    onChange={(event) => setValue({ ...value, language: event.target.value })}
                  />
                </Field>
                <Field label="Language options" htmlFor="nav-languages" hint="Comma-separated labels such as ENG, FR, RW.">
                  <input
                    id="nav-languages"
                    className="admin-field"
                    value={joinList(value.languages)}
                    onChange={(event) => setValue({ ...value, languages: splitList(event.target.value) })}
                  />
                </Field>
              </FieldGrid>
            </div>
            <p className="admin-help">
              Currency and language are display options only. Prices are stored in the base currency configured in
              settings.
            </p>
          </FormSection>
        </div>

        <aside className="h-fit space-y-3 xl:sticky xl:top-[84px]">
          <div className="rounded-[8px] border border-admin-line bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-muted">Menu preview</p>
            <ul className="mt-3 space-y-1 text-[12px] text-ink">
              {value.nav.map((link, index) => (
                <li key={index}>
                  <span className="font-medium">{link.label || "Untitled"}</span>
                  {link.children.length ? (
                    <ul className="mt-1 space-y-0.5 border-l border-admin-line pl-3 text-[11px] text-admin-muted">
                      {link.children.map((child, childIndex) => (
                        <li key={childIndex}>{child.label || "Untitled"}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              {!value.nav.length ? <li className="text-admin-muted">No items.</li> : null}
            </ul>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] border border-admin-line bg-white px-3 text-[12px] font-medium text-ink hover:bg-tile"
          >
            Preview header on site
            <ExternalLink className="h-3 w-3" />
          </a>
          <p className="rounded-[6px] border border-admin-line bg-white p-3 text-[11px] leading-5 text-admin-muted">
            Links can be internal paths such as /search, anchors such as /#featured, or full https URLs.
          </p>
        </aside>
      </div>
    </SettingsSectionForm>
  );
}
