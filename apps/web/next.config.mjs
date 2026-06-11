/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sentinel/shared"],
  experimental: {
    typedRoutes: true
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:4000/:path*"
      }
    ];
  }
};

export default nextConfig;
