import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Stores are opened on subdomains such as kurta-house.localhost:3020 in development.
  allowedDevOrigins: ["*.localhost"],
};

export default nextConfig;
