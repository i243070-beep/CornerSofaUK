/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next's default .next directory contains junction-backed files on some
  // OneDrive checkouts; a normal ignored folder keeps development/build reliable.
  distDir: process.env.NEXT_BUILD_DIR || (process.env.VERCEL ? '.next' : 'artifacts/next'),
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node', 'sharp'],
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
  },
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
