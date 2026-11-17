import { CurrencyProvider } from "@/components/currency/CurrencyProvider";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <CurrencyProvider>{children}</CurrencyProvider>;
}