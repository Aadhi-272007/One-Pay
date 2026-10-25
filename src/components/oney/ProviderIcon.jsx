import { useState } from "react";
import { Globe } from "lucide-react";

// Provider favicon fetched from its verified official URL (Google's favicon
// service resolves the domain's real icon — nothing is invented). Falls back
// to a neutral globe icon when there's no valid URL or the icon fails to load.
export default function ProviderIcon({ url, size = 24, className = "" }) {
  const [failed, setFailed] = useState(false);
  let src = null;
  try {
    const host = new URL(url).hostname;
    src = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch { /* no valid URL — fallback icon */ }

  if (!src || failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 ${className}`}
        style={{ width: size, height: size }}
      >
        <Globe style={{ width: Math.round(size * 0.55), height: Math.round(size * 0.55) }} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-lg bg-white object-contain ring-1 ring-slate-200 dark:ring-slate-700 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}