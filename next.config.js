const nextConfig = {
  serverExternalPackages: ['sharp'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5gb',
    },
  },
};

module.exports = nextConfig; 