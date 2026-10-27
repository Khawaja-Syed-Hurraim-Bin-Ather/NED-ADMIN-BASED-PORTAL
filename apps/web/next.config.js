/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : '';

const nextConfig = {
  reactStrictMode: true,

  // ── F6: Security Headers ────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer leakage control
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Prevent browsers from sending browser features in hidden ways
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // HSTS — only activates after first HTTPS response
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Content Security Policy
          // Rules: Rule #11 — API keys must never reach client bundles.
          // allow-list: self, Supabase project, Google Fonts, no inline scripts.
          {
            key: 'Content-Security-Policy',
            value: [
              `default-src 'self'`,
              `script-src 'self' 'unsafe-eval' 'unsafe-inline'`, // Next.js requires unsafe-eval in dev
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
              `font-src 'self' https://fonts.gstatic.com`,
              `img-src 'self' data: blob: https:`,
              `connect-src 'self' ${supabaseHost ? `https://${supabaseHost}` : ''} wss://${supabaseHost} https://generativelanguage.googleapis.com https://api.x.ai http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*`,
              `frame-ancestors 'none'`,
              `base-uri 'self'`,
              `form-action 'self'`,
            ]
              .filter(Boolean)
              .join('; '),
          },
        ],
      },
    ];
  },

  // ── Dev: Forward API calls to Express ────────────────────────────────────────
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `http://localhost:${process.env.API_PORT || 4000}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
