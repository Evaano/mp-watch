import type { NextConfig } from "next";
import { ALLOW_INDEXING } from "./src/lib/site";

const nextConfig: NextConfig = {
  // No images.remotePatterns on purpose. Portraits are mirrored into
  // public/members/ by scripts/ingest/mirror_photos.py, because the Majlis
  // Cloudflare answers 403 to Vercel's image optimiser even though it serves
  // browsers fine. Re-adding a remote pattern brings the broken images back.
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
