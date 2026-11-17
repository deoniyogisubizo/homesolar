import { getCustomerAddresses } from "@/app/(auth)/actions/dashboard-actions";
import { AccountLayout } from "@/components/account/AccountLayout";
import AddressesList from "./AddressesList";

export const instant = false;

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const addressesResponse = await getCustomerAddresses();

  return (
    <AccountLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-ink">Addresses</h1>
            <p className="mt-1 text-muted">
              Save delivery locations with the nearest public landmark so couriers can find you
            </p>
          </div>
        </div>

        <AddressesList addresses={addressesResponse.ok ? addressesResponse.data.addresses : []} />
      </div>
    </AccountLayout>
  );
}