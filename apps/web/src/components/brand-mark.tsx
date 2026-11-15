import Image from "next/image";
import { isStudioDesign } from "@/lib/design-variant";

export function BrandMark({ variant = "color" }: { variant?: "color" | "white" }) {
  if (!isStudioDesign) {
    return <Image className="brand-logo" src="/logo.webp" width={289} height={152} alt="Studio Animal-Aided Design" unoptimized priority />;
  }
  return (
    <Image
      className="brand-logo"
      src={variant === "white" ? "/brand/studio-aad-white.png" : "/brand/studio-aad-color.jpg"}
      width={1740}
      height={variant === "white" ? 856 : 836}
      alt="Studio Animal-Aided Design"
      unoptimized
      priority
    />
  );
}
