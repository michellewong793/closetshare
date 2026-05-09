/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // unoptimized: skips server-side fetching entirely — images load
    // directly in the browser. Safe for demo; swap to false + remotePatterns
    // once you move image hosting to Supabase Storage.
    unoptimized: true,
  },
};
 
module.exports = nextConfig;
 