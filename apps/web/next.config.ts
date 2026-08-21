import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "animal-aided-design.de" },
      { protocol: "https", hostname: "image.jimcdn.com" }
    ]
  }
};

export default nextConfig;
