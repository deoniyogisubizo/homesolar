"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

type DeliveryConfirmFormProps = {
  token: string;
  orderNumber: string;
  amountDue: number;
  paymentMethod: string;
  currencySymbol: string;
  pinRequired: boolean;
  geolocationRequired: boolean;
};

type Coordinates = { lat: number; lng: number; accuracy?: number | null };

type ConfirmResponse = {
  ok: boolean;
  error?: string;
  locked?: boolean;
  delivered?: boolean;
  alreadyDelivered?: boolean;
  deliveredAt?: string | null;
  mismatch?: boolean;
};

export function DeliveryConfirmForm({
  token,
  orderNumber,
  amountDue,
  paymentMethod,
  currencySymbol,
  pinRequired,
  geolocationRequired,
}: DeliveryConfirmFormProps) {
  const [pin, setPin] = useState("");
  const [confirmedBy, setConfirmedBy] = useState("");
  const [collectedAmount, setCollectedAmount] = useState(String(amountDue));
  const [method, setMethod] = useState<"cash" | "mobile_money">("cash");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState<{ alreadyDelivered: boolean; deliveredAt?: string | null; mismatch?: boolean } | null>(null);

  const needsCollection = paymentMethod === "cash_on_delivery";

  async function shareLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("This device can not share a location. Ask the office to confirm the delivery.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocating(false);
      },
      () => {
        setLocationError("Location was not shared. Allow location access and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLocked(false);

    if (geolocationRequired && !coordinates) {
      setError("Share the delivery location before confirming.");
      return;
    }

    const response = await fetch(`/api/delivery/${token}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin: pinRequired ? pin : "000000",
        confirmedBy: confirmedBy.trim(),
        collectedAmount: Number(collectedAmount),
        collectedMethod: method,
        coordinates,
      }),
    });

    const payload = (await response.json().catch(() => null)) as ConfirmResponse | null;
    if (!response.ok || !payload?.ok) {
      setError(payload?.error ?? "The delivery could not be confirmed.");
      setLocked(Boolean(payload?.locked));
      return;
    }

    setDone({
      alreadyDelivered: Boolean(payload.alreadyDelivered),
      deliveredAt: payload.deliveredAt ?? null,
      mismatch: Boolean(payload.mismatch),
    });
  }

  if (done) {
    return (
      <div className="border border-line bg-tile p-6 text-center">
        <h2 className="text-[18px] font-semibold text-ink">Delivered</h2>
        <p className="mt-2 text-[13px] text-muted">
          {done.alreadyDelivered
            ? `Order ${orderNumber} was already delivered. No further action is needed.`
            : `Order ${orderNumber} was marked as delivered.`}
        </p>
        {done.deliveredAt ? (
          <p className="mt-2 text-[13px] text-muted">
            Confirmed at {new Date(done.deliveredAt).toLocaleString("en-GB")}
          </p>
        ) : null}
        {done.mismatch ? (
          <p className="mt-3 border border-warning/30 bg-warning-pale px-3 py-2 text-[12px] text-warning">
            The collected amount does not match the order total. The office has been flagged to review it.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {pinRequired ? (
        <div>
          <label htmlFor="delivery-pin" className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
            Delivery code
          </label>
          <input
            id="delivery-pin"
            name="pin"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            required
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6 digit code"
            className="h-14 w-full rounded-[4px] border border-line bg-white px-4 text-center text-[22px] font-semibold tracking-[0.3em] text-ink outline-none focus:border-navy"
          />
          <p className="mt-2 text-[11px] text-muted">Ask the customer for the code. Enter it when the items are in hand.</p>
        </div>
      ) : null}

      {needsCollection ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="delivery-amount" className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
              Collected amount
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">
                {currencySymbol}
              </span>
              <input
                id="delivery-amount"
                name="collectedAmount"
                inputMode="decimal"
                required
                value={collectedAmount}
                onChange={(event) => setCollectedAmount(event.target.value)}
                className="h-12 w-full rounded-[4px] border border-line bg-white pl-12 pr-4 text-[16px] text-ink outline-none focus:border-navy"
              />
            </div>
          </div>
          <div>
            <label htmlFor="delivery-method" className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
              Collected method
            </label>
            <select
              id="delivery-method"
              name="collectedMethod"
              value={method}
              onChange={(event) => setMethod(event.target.value as "cash" | "mobile_money")}
              className="h-12 w-full rounded-[4px] border border-line bg-white px-4 text-[16px] text-ink outline-none focus:border-navy"
            >
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile money</option>
            </select>
          </div>
        </div>
      ) : null}

      {geolocationRequired ? (
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Delivery location</p>
          {coordinates ? (
            <p className="flex items-center gap-2 text-[12px] text-success">
              <MapPin className="h-4 w-4" />
              Location captured ({coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)})
            </p>
          ) : (
            <button
              type="button"
              onClick={shareLocation}
              disabled={locating}
              className="inline-flex h-11 items-center gap-2 rounded-[4px] border border-line bg-white px-4 text-[12px] font-medium text-ink hover:bg-tile disabled:opacity-60"
            >
              <MapPin className="h-4 w-4" />
              {locating ? "Getting location..." : "Share delivery location"}
            </button>
          )}
          {locationError ? <p className="mt-2 text-[12px] text-danger">{locationError}</p> : null}
        </div>
      ) : null}

      <div>
        <label htmlFor="delivery-agent" className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
          Confirming agent name
        </label>
        <input
          id="delivery-agent"
          name="confirmedBy"
          required
          value={confirmedBy}
          onChange={(event) => setConfirmedBy(event.target.value)}
          placeholder="Agent full name"
          className="h-12 w-full rounded-[4px] border border-line bg-white px-4 text-[16px] text-ink outline-none focus:border-navy"
        />
      </div>

      {error ? <p className="text-[12px] font-medium text-danger">{error}</p> : null}
      {locked ? <p className="text-[12px] font-medium text-danger">The delivery code is locked. Try again later.</p> : null}

      <button
        type="submit"
        className="inline-flex h-14 w-full items-center justify-center rounded-[4px] bg-ink text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-navy"
      >
        Confirm delivery
      </button>
    </form>
  );
}
