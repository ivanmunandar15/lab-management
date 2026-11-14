import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, alt = "" }: { className?: string; alt?: string }) {
  return (
    <Image
      src="/brand/company-logo.png"
      alt={alt}
      width={88}
      height={76}
      priority
      className={cn("h-9 w-auto object-contain", className)}
    />
  );
}