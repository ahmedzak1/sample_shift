import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No dev badge: it sits over the editor. Build errors still show in the error overlay.
  devIndicators: false,
};

export default nextConfig;
