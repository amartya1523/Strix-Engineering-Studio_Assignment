import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  typescript: {
    tsconfigPath: process.env.CODEATLAS_E2E === 'true' ? 'tsconfig.e2e.json' : 'tsconfig.json',
  },
  distDir: process.env.CODEATLAS_E2E === 'true' ? '.next-e2e' : '.next',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
export default config;
