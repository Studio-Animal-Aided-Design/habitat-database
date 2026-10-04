import type { NextConfig } from "next";
import path from "node:path";

const workspaceRoot = path.join(process.cwd(), "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "animal-aided-design.de" },
      { protocol: "https", hostname: "image.jimcdn.com" }
    ]
  }
};

export default nextConfig;
