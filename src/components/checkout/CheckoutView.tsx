"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, MessageCircle } from "lucide-react";
import { Price } from "@/components/currency/Price";
import { RWANDA_PROVINCE_NAMES } from "@/lib/rwanda-locations";
import { checkoutSchema } from "@/schemas/checkout";
import type { CartResponse } from "@/types";

type DeliveryLocation = {
  name: string;
  province: string;
  sectors: string[];
};

type CustomerPrefill = {
  name: string;
  email: string;
  phone: string;
};

type CheckoutValues = {
  name: string;
  email: string;
  phone: string;
  province: string;
  district: string;
  sector: string;
  address: string;
  landmark: string;
  notes: string;
};

type CheckoutViewProps = {
  initialCart: CartResponse;
  locations: DeliveryLocation[];
  customer: CustomerPrefill | null;
  orderingAvailable: boolean;
  helperText: string;
  supportEmail: string;
  supportPhone: string;
};

const STORAGE_KEY = "homesolar.checkout";
const FIELD_ORDER = [
  "customer.name",
  "customer.email",
  "customer.phone",
  "delivery.province",
  "delivery.district",
  "delivery.sector",
  "delivery.address",
  "delivery.landmark",
];
const FIELD_NAMES: Record<string, string> = {
  "customer.name": "customer.name",
  "customer.email": "customer.email",
  "customer.phone": "customer.phone",
  "delivery.province": "delivery.province",
  "delivery.district": "delivery.district",
  "delivery.sector": "delivery.sector",
  "delivery.address": "delivery.address",
  "delivery.landmark": "delivery.landmark",
  notes: "notes",
};
const ERROR_KEYS: Record<keyof CheckoutValues, string> = {
  name: "customer.name",
  email: "customer.email",
  phone: "customer.phone",
  province: "delivery.province",
  district: "delivery.district",
  sector: "delivery.sector",
  address: "delivery.address",
  landmark: "delivery.landmark",
  notes: "notes",
};

const inputClass = (invalid: boolean) =>
  `h-11 w-full rounded-[4px] border bg-white px-3 text-[13px] text-ink outline-none transition-colors placeholder:text-muted focus:border-brand ${
    invalid ? "border-red-400" : "border-line"
  }`;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-[11px] text-red-700">
      {message}
    </p>
  );
}

export function CheckoutView({
  initialCart,
  locations,
  customer,
  orderingAvailable,
  helperText,
  supportEmail,
  supportPhone,
}: CheckoutViewProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const idempotencyKey = useRef<string | null>(null);
  const [quote, setQuote] = useState<CartResponse>(initialCart);
  const [values, setValues] = useState<CheckoutValues>({
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    province: "",
    district: "",
    sector: "",
    address: "",
    landmark: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restored, setRestored] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  useEffect(() => {
    if (!idempotencyKey.current) {
      idempotencyKey.current = crypto.randomUUID();
    }
  }, []);

  useEffect(() => {
    if (customer) {
      const timer = window.setTimeout(() => setRestored(true), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as Partial<CheckoutValues>;
        const province =
          typeof parsed.province === "string" &&
          locations.some((entry) => entry.province === parsed.province)
            ? parsed.province
            : "";
        const location = locations.find(
          (entry) =>
            entry.name === parsed.district && (!province || entry.province === province),
        );
        setValues((current) => ({
          name: typeof parsed.name === "string" ? parsed.name : current.name,
          email: typeof parsed.email === "string" ? parsed.email : current.email,
          phone: typeof parsed.phone === "string" ? parsed.phone : current.phone,
          province: location?.province ?? province,
          district: location ? location.name : "",
          sector:
            location && typeof parsed.sector === "string" && location.sectors.includes(parsed.sector)
              ? parsed.sector
              : "",
          address: typeof parsed.address === "string" ? parsed.address : current.address,
          landmark: typeof parsed.landmark === "string" ? parsed.landmark : current.landmark,
          notes: typeof parsed.notes === "string" ? parsed.notes : current.notes,
        }));
      } catch {
        return;
      } finally {
        setRestored(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [customer, locations]);

  useEffect(() => {
    if (!restored || customer) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      return;
    }
  }, [values, restored, customer]);

  useEffect(() => {
    const location = locations.find(
      (entry) => entry.name === values.district && entry.province === values.province,
    );
    if (!location) {
      const timer = window.setTimeout(() => setQuote(initialCart), 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;
    const params = new URLSearchParams({
      district: location.name,
      province: location.province,
    });
    fetch(`/api/cart?${params.toString()}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CartResponse | null) => {
        if (active && data) setQuote(data);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [values.district, values.province, locations, initialCart]);

  const update = (field: keyof CheckoutValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    const key = ERROR_KEYS[field];
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const focusFirstError = (fieldErrors: Record<string, string>) => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (!first) {
      errorRef.current?.focus();
      return;
    }
    const element = formRef.current?.querySelector<HTMLElement>(
      `[name="${FIELD_NAMES[first]}"]`,
    );
    element?.focus();
  };

  const onChange = (field: "province" | "district" | "sector", value: string) => {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "province") {
        next.district = "";
        next.sector = "";
      } else if (field === "district") {
        next.sector = "";
      }
      return next;
    });
    setErrors((current) => {
      const keys =
        field === "province"
          ? [ERROR_KEYS.province, ERROR_KEYS.district, ERROR_KEYS.sector]
          : field === "district"
            ? [ERROR_KEYS.district, ERROR_KEYS.sector]
            : [ERROR_KEYS.sector];
      const next = { ...current };
      for (const key of keys) delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const honeypot =
      (event.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();

    const parsed = checkoutSchema.safeParse({
      idempotencyKey: idempotencyKey.current,
      customer: {
        name: values.name,
        email: values.email,
        phone: values.phone,
      },
      delivery: {
        province: values.province,
        district: values.district,
        sector: values.sector,
        address: values.address,
        landmark: values.landmark,
      },
      notes: values.notes,
      whatsappOptIn,
      honeypot,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (path === "honeypot") continue;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      setFormError("Check the highlighted fields before continuing.");
      focusFirstError(fieldErrors);
      return;
    }

    if (!orderingAvailable) {
      setFormError(
        "Ordering is temporarily unavailable. Please contact us using the details beside the summary.",
      );
      errorRef.current?.focus();
      return;
    }

    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;

    setSubmitting(true);
    setErrors({});
    setFormError(null);

    try {
      const response = await fetch("/api/checkout/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            orderNumber?: string;
            token?: string;
            whatsappUrl?: string;
            error?: string;
            details?: Array<{ path: string; message: string }> | Record<string, string>;
          }
        | null;

      if (!response.ok || !data?.orderNumber || !data.token || !data.whatsappUrl) {
        popup?.close();
        const fieldErrors: Record<string, string> = {};
        if (Array.isArray(data?.details)) {
          for (const detail of data.details) {
            if (!fieldErrors[detail.path]) fieldErrors[detail.path] = detail.message;
          }
        } else if (data?.details && typeof data.details === "object") {
          for (const [path, message] of Object.entries(data.details)) {
            if (typeof message === "string") fieldErrors[path] = message;
          }
        }
        setErrors(fieldErrors);
        setFormError(
          data?.error ?? "The order could not be saved. Check your details and try again.",
        );
        setSubmitting(false);
        if (Object.keys(fieldErrors).length) {
          focusFirstError(fieldErrors);
        } else {
          errorRef.current?.focus();
        }
        return;
      }

      const confirmation = `/order/${encodeURIComponent(data.orderNumber)}?t=${encodeURIComponent(
        data.token,
      )}`;
      if (popup) {
        popup.location.href = data.whatsappUrl;
      }
      router.push(confirmation);
    } catch {
      popup?.close();
      setFormError("The order could not be saved. Check your connection and try again.");
      setSubmitting(false);
      errorRef.current?.focus();
    }
  };

  const provinces = useMemo(() => {
    const available = new Set(locations.map((entry) => entry.province));
    const ordered = RWANDA_PROVINCE_NAMES.filter((name) => available.has(name));
    for (const name of available) {
      if (!ordered.includes(name)) ordered.push(name);
    }
    return ordered;
  }, [locations]);
  const districtOptions = useMemo(
    () => locations.filter((entry) => entry.province === values.province),
    [locations, values.province],
  );
  const selectedLocation =
    districtOptions.find((entry) => entry.name === values.district) ?? null;
  const addressInvalid = Boolean(errors["delivery.address"]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <form ref={formRef} onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
        <div
          ref={errorRef}
          tabIndex={-1}
          aria-live="polite"
          className={formError ? "outline-none" : ""}
        >
          {formError ? (
            <div className="flex items-start gap-2.5 border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span>{formError}</span>
            </div>
          ) : null}
        </div>

        <section className="border border-line p-5 sm:p-6">
          <div className="border-b border-line pb-4">
            <h2 className="text-[17px] font-semibold text-ink">Contact details</h2>
            <p className="mt-1 text-[12px] text-muted">
              We use these details only to confirm and deliver this order.
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="customer.name" className="text-[12px] font-medium text-ink">
                Full name
              </label>
              <input
                id="customer.name"
                name="customer.name"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                autoComplete="name"
                aria-invalid={Boolean(errors["customer.name"])}
                aria-describedby={errors["customer.name"] ? "customer.name-error" : undefined}
                className={`mt-1.5 ${inputClass(Boolean(errors["customer.name"]))}`}
              />
              <FieldError id="customer.name-error" message={errors["customer.name"]} />
            </div>
            <div>
              <label htmlFor="customer.phone" className="text-[12px] font-medium text-ink">
                Phone number
              </label>
              <input
                id="customer.phone"
                name="customer.phone"
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(event) => update("phone", event.target.value)}
                autoComplete="tel"
                placeholder="+250 788 000 000"
                aria-invalid={Boolean(errors["customer.phone"])}
                aria-describedby={errors["customer.phone"] ? "customer.phone-error" : undefined}
                className={`mt-1.5 ${inputClass(Boolean(errors["customer.phone"]))}`}
              />
              <FieldError id="customer.phone-error" message={errors["customer.phone"]} />
            </div>
            <div>
              <label htmlFor="customer.email" className="text-[12px] font-medium text-ink">
                Email address
              </label>
              <input
                id="customer.email"
                name="customer.email"
                type="email"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                autoComplete="email"
                aria-invalid={Boolean(errors["customer.email"])}
                aria-describedby={errors["customer.email"] ? "customer.email-error" : undefined}
                className={`mt-1.5 ${inputClass(Boolean(errors["customer.email"]))}`}
              />
              <FieldError id="customer.email-error" message={errors["customer.email"]} />
            </div>
          </div>
        </section>

        <section className="border border-line p-5 sm:p-6">
          <div className="border-b border-line pb-4">
            <h2 className="text-[17px] font-semibold text-ink">Delivery</h2>
            <p className="mt-1 text-[12px] text-muted">
              Choose the province, district and sector where the order should be delivered.
            </p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="delivery.province" className="text-[12px] font-medium text-ink">
                Province
              </label>
              <select
                id="delivery.province"
                name="delivery.province"
                value={values.province}
                onChange={(event) => onChange("province", event.target.value)}
                aria-invalid={Boolean(errors["delivery.province"])}
                aria-describedby={
                  errors["delivery.province"] ? "delivery.province-error" : undefined
                }
                className={`mt-1.5 ${inputClass(Boolean(errors["delivery.province"]))}`}
              >
                <option value="">Select province</option>
                {provinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
              <FieldError id="delivery.province-error" message={errors["delivery.province"]} />
            </div>
            <div>
              <label htmlFor="delivery.district" className="text-[12px] font-medium text-ink">
                District
              </label>
              <select
                id="delivery.district"
                name="delivery.district"
                value={values.district}
                onChange={(event) => onChange("district", event.target.value)}
                disabled={!values.province}
                aria-invalid={Boolean(errors["delivery.district"])}
                aria-describedby={
                  errors["delivery.district"] ? "delivery.district-error" : undefined
                }
                className={`mt-1.5 ${inputClass(Boolean(errors["delivery.district"]))} disabled:bg-tile disabled:text-muted`}
              >
                <option value="">
                  {values.province ? "Select district" : "Choose a province first"}
                </option>
                {districtOptions.map((location) => (
                  <option key={location.name} value={location.name}>
                    {location.name}
                  </option>
                ))}
              </select>
              <FieldError id="delivery.district-error" message={errors["delivery.district"]} />
            </div>
            <div>
              <label htmlFor="delivery.sector" className="text-[12px] font-medium text-ink">
                Sector
              </label>
              <select
                id="delivery.sector"
                name="delivery.sector"
                value={values.sector}
                onChange={(event) => onChange("sector", event.target.value)}
                disabled={!selectedLocation}
                aria-invalid={Boolean(errors["delivery.sector"])}
                aria-describedby={errors["delivery.sector"] ? "delivery.sector-error" : undefined}
                className={`mt-1.5 ${inputClass(Boolean(errors["delivery.sector"]))} disabled:bg-tile disabled:text-muted`}
              >
                <option value="">{selectedLocation ? "Select sector" : "Choose a district first"}</option>
                {selectedLocation?.sectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              <FieldError id="delivery.sector-error" message={errors["delivery.sector"]} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="delivery.address" className="text-[12px] font-medium text-ink">
                Delivery address
              </label>
              <textarea
                id="delivery.address"
                name="delivery.address"
                rows={2}
                value={values.address}
                onChange={(event) => update("address", event.target.value)}
                autoComplete="street-address"
                placeholder="Street, house number, or plot"
                aria-invalid={addressInvalid}
                aria-describedby={addressInvalid ? "delivery.address-error" : undefined}
                className={`mt-1.5 w-full resize-y rounded-[4px] border bg-white px-3 py-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-muted focus:border-brand ${
                  addressInvalid ? "border-red-400" : "border-line"
                }`}
              />
              <FieldError id="delivery.address-error" message={errors["delivery.address"]} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="delivery.landmark" className="text-[12px] font-medium text-ink">
                Nearby landmark <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="delivery.landmark"
                name="delivery.landmark"
                value={values.landmark}
                onChange={(event) => update("landmark", event.target.value)}
                placeholder="Church, school, or shop nearby"
                aria-invalid={Boolean(errors["delivery.landmark"])}
                aria-describedby={
                  errors["delivery.landmark"] ? "delivery.landmark-error" : undefined
                }
                className={`mt-1.5 ${inputClass(Boolean(errors["delivery.landmark"]))}`}
              />
              <FieldError id="delivery.landmark-error" message={errors["delivery.landmark"]} />
            </div>
          </div>
        </section>

        <section className="border border-line p-5 sm:p-6">
          <div className="border-b border-line pb-4">
            <h2 className="text-[17px] font-semibold text-ink">Order notes</h2>
            <p className="mt-1 text-[12px] text-muted">
              Add delivery instructions or anything the team should know.
            </p>
          </div>
          <div className="mt-5">
            <label htmlFor="notes" className="text-[12px] font-medium text-ink">
              Notes <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={values.notes}
              onChange={(event) => update("notes", event.target.value)}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "notes-error" : undefined}
              className={`mt-1.5 w-full resize-y rounded-[4px] border bg-white px-3 py-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-muted focus:border-brand ${
                errors.notes ? "border-red-400" : "border-line"
              }`}
            />
            <FieldError id="notes-error" message={errors.notes} />
          </div>
          <label className="mt-5 flex items-start gap-2.5 border-t border-line pt-4 text-[12px] leading-5 text-ink">
            <input
              type="checkbox"
              checked={whatsappOptIn}
              onChange={(event) => setWhatsappOptIn(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              Send order updates on WhatsApp
              <span className="block text-[11px] text-muted">
                We use your number for order confirmations, delivery updates and invoices. You can ask us to stop at any time.
              </span>
            </span>
          </label>
        </section>

        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <button
          type="submit"
          disabled={submitting || !orderingAvailable}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-[#25D366] px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <MessageCircle className="h-4 w-4" strokeWidth={2} />
          )}
          {submitting ? "Saving your order..." : "Continue on WhatsApp"}
        </button>

        {orderingAvailable ? (
          <p className="text-[11px] leading-5 text-muted">{helperText}</p>
        ) : (
          <div className="border border-warning/30 bg-warning-pale px-4 py-3 text-[12px] leading-5 text-warning">
            <p>Ordering is temporarily unavailable. Please contact us.</p>
            <p className="mt-1">
              <a href={`tel:${supportPhone}`} className="underline underline-offset-2">
                {supportPhone}
              </a>
              {" · "}
              <a href={`mailto:${supportEmail}`} className="underline underline-offset-2">
                {supportEmail}
              </a>
            </p>
          </div>
        )}
      </form>

      <aside className="h-fit bg-tile p-6 lg:sticky lg:top-[110px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-semibold text-ink">Order summary</h2>
          <Link href="/cart" className="text-[11px] text-muted underline underline-offset-2 hover:text-ink">
            Edit cart
          </Link>
        </div>
        <ul className="mt-4 max-h-[260px] space-y-3 overflow-y-auto pr-1">
          {quote.items.map((item) => (
            <li key={item.key} className="flex items-start justify-between gap-3 text-[12px]">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{item.product.name}</p>
                <p className="mt-0.5 text-muted">
                  {item.variant
                    ? [item.variant.color, item.variant.size].filter(Boolean).join(" · ")
                    : item.product.category.name}
                  {item.variant ? " · " : ""}
                  Qty {item.quantity}
                </p>
              </div>
              <span className="whitespace-nowrap font-medium text-ink">
                <Price value={item.lineTotal} />
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-3 border-t border-line pt-4 text-[13px]">
          <div className="flex justify-between gap-4 text-muted">
            <dt>Subtotal</dt>
            <dd className="text-ink">
              <Price value={quote.subtotal} />
            </dd>
          </div>
          {quote.campaignDiscount > 0 ? (
            <div className="flex justify-between gap-4 text-muted">
              <dt>Campaign discount</dt>
              <dd className="text-success">
                −<Price value={quote.campaignDiscount} />
              </dd>
            </div>
          ) : null}
          {quote.couponDiscount > 0 ? (
            <div className="flex justify-between gap-4 text-muted">
              <dt>Coupon {quote.coupon ? `(${quote.coupon.code})` : ""}</dt>
              <dd className="text-success">
                −<Price value={quote.couponDiscount} />
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 text-muted">
            <dt>Shipping</dt>
            <dd className="text-ink">
              {quote.shippingPending ? (
                "Calculated next"
              ) : quote.freeShipping || quote.shipping === 0 ? (
                "Free"
              ) : (
                <Price value={quote.shipping} />
              )}
            </dd>
          </div>
          {quote.tax > 0 ? (
            <div className="flex justify-between gap-4 text-muted">
              <dt>Tax</dt>
              <dd className="text-ink">
                <Price value={quote.tax} />
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-line pt-3 text-[15px] font-semibold text-ink">
            <dt>Total</dt>
            <dd>
              <Price value={quote.total} />
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] leading-5 text-muted">
          Shipping is added after you choose a province and district. The final total is
          recalculated on the server before the order is saved.
        </p>
      </aside>
    </div>
  );
}
