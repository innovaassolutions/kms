import createCache from '@emotion/cache';

// This cache is required for Chakra UI SSR with Next.js (app directory)
export const emotionCache = createCache({
  key: 'css',
  prepend: true,
}); 