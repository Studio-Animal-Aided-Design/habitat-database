export const appEnvironments = ["development", "test", "preview", "production"] as const;

export type AppEnvironment = (typeof appEnvironments)[number];

type RuntimeEnvironment = Record<string, string | undefined>;

export function resolveAppEnvironment(environment: RuntimeEnvironment = process.env): AppEnvironment {
  const configured = environment.APP_ENV?.trim();
  if (configured) {
    if (!appEnvironments.includes(configured as AppEnvironment)) {
      throw new Error(`APP_ENV must be one of: ${appEnvironments.join(", ")}.`);
    }
    return configured as AppEnvironment;
  }

  if (environment.NODE_ENV === "test") return "test";
  if (environment.NODE_ENV === "production") return "production";
  return "development";
}

export const appEnvironment = resolveAppEnvironment();
export const isPreviewEnvironment = appEnvironment === "preview";
