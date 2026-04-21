/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only app — no pages needed
  reactStrictMode: true,

  // Allow large request bodies (base64 images can be 10MB+)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

module.exports = nextConfig;
