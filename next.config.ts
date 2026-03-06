import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // www → apex (belt-and-suspenders alongside middleware)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.junkymunky.com" }],
        destination: "https://junkymunky.com/:path*",
        permanent: true,
      },
      { source: "/home",  destination: "/", permanent: true },
      { source: "/index", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
