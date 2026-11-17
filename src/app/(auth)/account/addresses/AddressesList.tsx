"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Check,
  Loader2,
  X,
  Star,
  Landmark,
  Phone,
} from "lucide-react";
import {
  addCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "@/app/(auth)/actions/dashboard-actions";
import {
  getDistricts,
  getSectors,
  RWANDA_PROVINCES,
} from "@/lib/rwanda-locations";

const MAX_ADDRESSES = 8;

const LABEL_OPTIONS = ["Home", "Work", "Other"];

type AddressRecord = {
  id: string;
  label: string;
  line1: string;
  province: string;
  district: string;
  sector: string;
  landmark: string;
  phone: string;
  isDefault: boolean;
};

type AddressFormState = {
  label: string;
  line1: string;
  province: string;
  district: string;
  sector: string;
  landmark: string;
  phone: string;
  isDefault: boolean;
};

const EMPTY_FORM: AddressFormState = {
  label: "",
  line1: "",
  province: "",
  district: "",
  sector: "",
  landmark: "",
  phone: "",
  isDefault: false,
};

function toFormState(address: AddressRecord): AddressFormState {
  return {
    label: address.label,
    line1: address.line1,
    province: address.province,
    district: address.district,
    sector: address.sector,
    landmark: address.landmark,
    phone: address.phone,
    isDefault: address.isDefault,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export default function AddressesList({ addresses }: { addresses: AddressRecord[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const districts = form.province ? getDistricts(form.province) : [];
  const sectors =
    form.province && form.district
      ? getSectors(form.province, form.district)
      : [];

  const openNewAddress = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setFieldErrors({});
    setShowForm(true);
  };

  const openEditAddress = (address: AddressRecord) => {
    setForm(toFormState(address));
    setEditingId(address.id);
    setFormError(null);
    setFieldErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = editingId
        ? await updateCustomerAddress(editingId, form)
        : await addCustomerAddress(form);

      if (!response.ok) {
        setFormError(response.error);
        setFieldErrors(response.fieldErrors ?? {});
        return;
      }

      closeForm();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (address: AddressRecord) => {
    if (
      !confirm(
        `Delete the "${address.label || "saved"}" address? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusyId(address.id);
    setError(null);
    try {
      const response = await deleteCustomerAddress(address.id);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if (editingId === address.id) closeForm();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (address: AddressRecord) => {
    setBusyId(address.id);
    setError(null);
    try {
      const response = await setDefaultCustomerAddress(address.id);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="rounded-[12px] border border-line bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-[18px] font-semibold text-ink">Saved Addresses</h2>
            <p className="mt-1 text-sm text-muted">
              {addresses.length} of {MAX_ADDRESSES} addresses saved
            </p>
          </div>
          <button
            onClick={openNewAddress}
            disabled={addresses.length >= MAX_ADDRESSES}
            className="inline-flex items-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50"
            title={
              addresses.length >= MAX_ADDRESSES
                ? `You can save up to ${MAX_ADDRESSES} addresses`
                : undefined
            }
          >
            <Plus className="h-4 w-4" />
            Add Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted mb-4" />
            <h3 className="text-[18px] font-semibold text-ink mb-2">
              No addresses saved
            </h3>
            <p className="text-muted mb-6">
              Add an address to speed up checkout and help us deliver to the
              right place.
            </p>
            <button
              onClick={openNewAddress}
              className="inline-flex items-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep"
            >
              <Plus className="h-4 w-4" />
              Add Your First Address
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => {
              const busy = busyId === address.id;
              return (
                <div
                  key={address.id}
                  className={`rounded-[8px] border p-4 transition-colors ${
                    address.isDefault
                      ? "border-brand/40 bg-brand/5"
                      : "border-line hover:border-brand/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="rounded-[4px] bg-tile px-2 py-0.5 text-[11px] font-medium text-muted">
                          {address.label || "Address"}
                        </span>
                        {address.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-[4px] bg-brand/10 text-brand px-2 py-0.5 text-[11px] font-medium">
                            <Star className="h-3 w-3 fill-current" />
                            Default
                          </span>
                        )}
                      </div>

                      {address.line1 && (
                        <p className="font-medium text-ink">{address.line1}</p>
                      )}
                      <p className="text-sm text-muted">
                        {[address.sector, address.district, address.province]
                          .filter(Boolean)
                          .join(", ")}
                      </p>

                      <p className="mt-2 flex items-start gap-2 text-sm text-ink">
                        <Landmark className="h-4 w-4 mt-0.5 shrink-0 text-brand" />
                        <span>
                          <span className="font-medium">Landmark:</span>{" "}
                          {address.landmark || "Not provided"}
                        </span>
                      </p>

                      {address.phone && (
                        <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                          <Phone className="h-4 w-4 shrink-0" />
                          {address.phone}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!address.isDefault && (
                        <button
                          onClick={() => handleSetDefault(address)}
                          disabled={busy || busyId !== null}
                          className="p-2 rounded-[6px] text-muted hover:bg-brand/10 hover:text-brand transition-colors disabled:opacity-50"
                          aria-label="Set as default address"
                          title="Set as default address"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => openEditAddress(address)}
                        disabled={busy}
                        className="p-2 rounded-[6px] text-muted hover:bg-tile hover:text-ink transition-colors disabled:opacity-50"
                        aria-label="Edit address"
                        title="Edit address"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(address)}
                        disabled={busy || busyId !== null}
                        className="p-2 rounded-[6px] text-muted hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-50"
                        aria-label="Delete address"
                        title="Delete address"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-form-title"
        >
          <div className="my-8 w-full max-w-lg rounded-[12px] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <h2 id="address-form-title" className="text-[18px] font-semibold text-ink">
                {editingId ? "Edit Address" : "Add Address"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded text-muted hover:bg-tile"
                aria-label="Close address form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-5 text-sm text-muted">
              Select the location of your home and describe a well-known public
              place nearby so our courier can find it.
            </p>

            {formError && (
              <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger-pale px-4 py-3 text-sm text-danger">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="address-label" className="block text-sm font-medium text-ink mb-1">
                  Label
                </label>
                <select
                  id="address-label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  required
                >
                  <option value="">Select label</option>
                  {LABEL_OPTIONS.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.label} />
              </div>

              <div>
                <label htmlFor="address-line1" className="block text-sm font-medium text-ink mb-1">
                  House / plot number, street
                </label>
                <input
                  id="address-line1"
                  type="text"
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="e.g. Plot 12, KG 11 Ave"
                  maxLength={200}
                />
                <p className="mt-1 text-xs text-muted">
                  Optional. Use your plot number or the street name if you have one.
                </p>
                <FieldError message={fieldErrors.line1} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="address-province" className="block text-sm font-medium text-ink mb-1">
                    Province
                  </label>
                  <select
                    id="address-province"
                    value={form.province}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        province: e.target.value,
                        district: "",
                        sector: "",
                      })
                    }
                    className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    required
                  >
                    <option value="">Select province</option>
                    {RWANDA_PROVINCES.map((province) => (
                      <option key={province.name} value={province.name}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors.province} />
                </div>

                <div>
                  <label htmlFor="address-district" className="block text-sm font-medium text-ink mb-1">
                    District
                  </label>
                  <select
                    id="address-district"
                    value={form.district}
                    onChange={(e) =>
                      setForm({ ...form, district: e.target.value, sector: "" })
                    }
                    className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-tile disabled:text-muted"
                    required
                    disabled={!form.province}
                  >
                    <option value="">
                      {form.province ? "Select district" : "Select province first"}
                    </option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  <FieldError message={fieldErrors.district} />
                </div>
              </div>

              <div>
                <label htmlFor="address-sector" className="block text-sm font-medium text-ink mb-1">
                  Sector
                </label>
                <select
                  id="address-sector"
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-tile disabled:text-muted"
                  required
                  disabled={!form.district}
                >
                  <option value="">
                    {form.district ? "Select sector" : "Select district first"}
                  </option>
                  {sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.sector} />
              </div>

              <div>
                <label htmlFor="address-landmark" className="block text-sm font-medium text-ink mb-1">
                  Main public place near your home
                </label>
                <textarea
                  id="address-landmark"
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="e.g. Near Kabuga market, opposite the health centre"
                  rows={2}
                  maxLength={300}
                  required
                />
                <p className="mt-1 text-xs text-muted">
                  This is required. Mention a market, school, church, health
                  centre, bus stop or other place everyone nearby knows.
                </p>
                <FieldError message={fieldErrors.landmark} />
              </div>

              <div>
                <label htmlFor="address-phone" className="block text-sm font-medium text-ink mb-1">
                  Phone
                </label>
                <input
                  id="address-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-[6px] border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="+250 7XX XXX XXX"
                  maxLength={40}
                  required
                />
                <p className="mt-1 text-xs text-muted">
                  The courier will call this number on delivery.
                </p>
                <FieldError message={fieldErrors.phone} />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                />
                <label htmlFor="isDefault" className="text-sm text-muted">
                  Set as default address
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 rounded-[6px] border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-tile transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-[6px] bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editingId ? "Save Changes" : "Add Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
