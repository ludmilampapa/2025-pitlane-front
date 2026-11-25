import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

// Content Security Policy. Next.js injects inline bootstrap scripts, so 'unsafe-inline' is kept for
// script-src (a nonce-based CSP would need middleware changes); 'unsafe-eval' is dev-only (HMR).
// The remaining directives block framing, <object>/<embed>, base-tag hijacking and form hijacking.
// connect-src allows https/wss because the backend (NEXT_PUBLIC_API_URL) and Supabase live on other origins.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.themealdb.com https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self' https: wss:${isProd ? '' : ' http://localhost:* ws://localhost:*'}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tbwmhbhifjqimftwmael.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'www.themealdb.com',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'hcakhjdklvxacqdcexuv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          ...(isProd
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
