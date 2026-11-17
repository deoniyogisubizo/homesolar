import {
  Activity,
  BatteryCharging,
  CloudSun,
  Headset,
  Leaf,
  Shield,
  ShieldCheck,
  Sun,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const productIcons: Record<string, LucideIcon> = {
  activity: Activity,
  battery: BatteryCharging,
  "cloud-sun": CloudSun,
  headset: Headset,
  leaf: Leaf,
  shield: ShieldCheck,
  "shield-outline": Shield,
  sun: Sun,
  truck: Truck,
  wrench: Wrench,
};

export function ProductIcon({
  name,
  className,
  strokeWidth = 1.7,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = productIcons[name] ?? Sun;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
