import type { NextConfig } from "next";
import { ALLOW_INDEXING } from "./src/lib/site";

const nextConfig: NextConfig = {
  async headers() {
    if (ALLOW_INDEXING) return [];
    // Belt and braces alongside the meta tag: the header also covers responses
    // that carry no HTML, such as the JSON payloads and any file downloads.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
