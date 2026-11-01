import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/": ["./tenants/**/*"],
    "/try-on": ["./tenants/**/*"],
    "/result": ["./tenants/**/*"],
    "/_not-found": ["./tenants/**/*"],
    "/api/try-on": ["./tenants/**/*"],
  },
};

export default nextConfig;
