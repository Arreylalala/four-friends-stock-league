import type { NextConfig } from 'next';

const repositoryName = 'four-friends-stock-league';
const isProductionBuild = process.env.NODE_ENV === 'production';
const basePath = isProductionBuild ? `/${repositoryName}` : '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
