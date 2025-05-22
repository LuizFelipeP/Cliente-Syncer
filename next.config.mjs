import nextPWA from "next-pwa";

const runtimeCaching = [
    {
        urlPattern: /^\/$/,
        handler: "NetworkFirst",
        options: {
            cacheName: "start-url",
        },
    },
    {
        urlPattern: /^\/(dashboard|login|register|edit-user)$/,
        handler: "NetworkFirst",
        options: {
            cacheName: "pages-cache",
            expiration: {
                maxEntries: 10,
                maxAgeSeconds: 24 * 60 * 60,
            },
        },
    },
    {
        urlPattern: /^\/_next\/.*\.(js|css|woff2?)$/i,
        handler: "CacheFirst",
        options: {
            cacheName: "next-assets",
            expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60,
            },
        },
    },
    {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
            cacheName: "image-cache",
            expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
            },
        },
    },
    {
        urlPattern: /\.(?:js|css|woff|woff2|eot|ttf|otf)$/,
        handler: "StaleWhileRevalidate",
        options: {
            cacheName: "static-assets",
            expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
            },
        },
    },
    {
        urlPattern: /^https?:\/\/.*\/api\/.*$/i,
        handler: "NetworkFirst",
        options: {
            cacheName: "api-cache",
            expiration: {
                maxEntries: 20,
                maxAgeSeconds: 5 * 60,
            },
        },
    },
];

const withPWA = nextPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    runtimeCaching,
});

const nextConfig = {};

export default withPWA(nextConfig);
