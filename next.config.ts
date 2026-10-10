import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  // Keep old Shopify URLs working (and their search ranking) after the switch.
  async redirects() {
    return [
      { source: "/blogs/news", destination: "/blog", permanent: true },
      { source: "/blogs/news/:slug", destination: "/blog/:slug", permanent: true },
      { source: "/policies/:slug", destination: "/pages/:slug", permanent: true },
      { source: "/pages/contact", destination: "/contact", permanent: true },
      { source: "/collections/:c/products/:slug", destination: "/products/:slug", permanent: true },
      { source: "/search", destination: "/shop", permanent: true },
      { source: "/account/login", destination: "/login", permanent: true },
      { source: "/account/register", destination: "/register", permanent: true },
    ];
  },
};

export default nextConfig;
