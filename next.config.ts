import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Friendly alias: /home → / (the actual home page).
  async redirects() {
    return [{ source: "/home", destination: "/", permanent: false }];
  },
};

export default nextConfig;
