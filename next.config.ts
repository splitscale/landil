import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // UploadThing CDN — serves resized WebP/AVIF automatically via next/image
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
    ],
    // Aggressively cache images at the edge
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
};

export default nextConfig;
