import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Protected pages and HttpOnly session cookies need a Node-capable Next.js host.
  // Static export cannot execute the server verification in app/learn or app/api.
};

export default nextConfig;
