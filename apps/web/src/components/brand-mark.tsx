import Image from "next/image";

export function BrandMark({ variant = "color" }: { variant?: "color" | "white" }) {
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
