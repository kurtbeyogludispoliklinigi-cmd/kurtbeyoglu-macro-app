// @ts-check
const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development', // Disable PWA in dev
    fallbacks: {
        document: '/offline.html',
    },
    runtimeCaching: [
        {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'supabase-cache',
                expiration: {
                    maxEntries: 64,
                    maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
            },
        },
    ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
