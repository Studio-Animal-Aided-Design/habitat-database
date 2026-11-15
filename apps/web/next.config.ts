import type { NextConfig } from "next";
import path from "node:path";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { resolveDesignVariant } from "./design.config";

const workspaceRoot = path.join(process.cwd(), "../..");

export default function nextConfig(phase: string): NextConfig {
  const design = resolveDesignVariant(process.env.APP_DESIGN, phase === PHASE_DEVELOPMENT_SERVER);
  return {
    output: "standalone",
    outputFileTracingRoot: workspaceRoot,
    distDir: design === "classic" ? ".next-classic" : ".next",
    env: { NEXT_PUBLIC_APP_DESIGN: design },
    webpack(config) {
      config.resolve.alias["@aad/design-styles.css"] = path.join(process.cwd(), "src/styles", `${design}.css`);
      return config;
    },
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "upload.wikimedia.org" },
        { protocol: "https", hostname: "animal-aided-design.de" },
        { protocol: "https", hostname: "image.jimcdn.com" }
      ]
    }
  };
}
