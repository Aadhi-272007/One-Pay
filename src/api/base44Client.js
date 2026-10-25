import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { throttleEntityReads } from '@/lib/apiThrottle';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  // When hosting the built site on your own server, set VITE_BASE44_SERVER_URL
  // in .env so the frontend can reach the Base44 backend (see DEPLOYMENT.md).
  serverUrl: import.meta.env.VITE_BASE44_SERVER_URL || '',
  appBaseUrl
});

// Pace entity reads client-side so bursts stay under the server's rate limit
// instead of failing with 429 "Rate limit exceeded".
base44.entities = throttleEntityReads(base44.entities);