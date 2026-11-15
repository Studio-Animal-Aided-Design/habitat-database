export type DesignVariant = "studio" | "classic";

export function resolveDesignVariant(value: string | undefined, development: boolean): DesignVariant {
  const variant = value?.trim() || "studio";
  if (variant !== "studio" && variant !== "classic") {
    throw new Error("APP_DESIGN must be studio or classic.");
  }
  if (variant === "classic" && !development) {
    throw new Error("APP_DESIGN=classic is a local development comparison. Deployment builds use studio.");
  }
  return variant;
}
