import { CurrencyProvider } from "@/components/currency/CurrencyProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <CurrencyProvider>{children}</CurrencyProvider>;
}