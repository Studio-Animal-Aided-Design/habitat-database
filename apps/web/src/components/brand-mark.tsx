import Image from "next/image";

export function BrandMark() {
  return (
    <Image
      className="brand-logo"
      src="/logo.webp"
      width={289}
      height={152}
      alt="Studio Animal-Aided Design"
      unoptimized
      priority
    />
  );
}
