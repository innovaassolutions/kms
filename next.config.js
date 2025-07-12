const nextConfig = {
  basePath: '/kms',
  assetPrefix: '/kms',
  serverExternalPackages: ['sharp'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5gb',
    },
  },
};

module.exports = nextConfig; 