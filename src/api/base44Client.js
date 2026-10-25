import { createClient } from "@base44/sdk";
import { appParams } from "@/lib/app-params";
import { throttleEntityReads } from "@/lib/apiThrottle";

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl:
    import.meta.env.VITE_BASE44_SERVER_URL?.trim() ||
    "https://base44.app",
  appBaseUrl,
});

// Pace entity reads to reduce rate-limit errors.
base44.entities = throttleEntityReads(base44.entities);
