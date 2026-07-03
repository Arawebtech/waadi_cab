/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove trailingSlash to fix routing issues with query parameters
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Static export for Capacitor
  output: 'export',
  // Disable server-side features for static export
}

export default nextConfig
