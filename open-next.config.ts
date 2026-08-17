import type { OpenNextConfig } from '@opennextjs/aws/types/open-next';
import cache from '@opennextjs/cloudflare/kv-cache';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      incrementalCache: async () => cache,
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
};

export default config;
