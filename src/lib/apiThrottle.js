// Client-side pacing for entity read calls (list/filter/count/aggregate).
// The server allows 70 reads per 60s per caller; bursts across pages
// (navigation, reloads, search, notification refresh) can exceed it and fail
// with 429. Calls above a safe ceiling are queued until a slot frees up.
const WINDOW_MS = 60000;
// Server allows 70/60s; stay well under it for headroom (residual traffic,
// SDK-internal reads and window timing differences).
const MAX_READS_PER_WINDOW = 40;

const stamps = [];
let chain = Promise.resolve();

export function scheduleRead(run) {
  const exec = async () => {
    const now = Date.now();
    while (stamps.length && stamps[0] <= now - WINDOW_MS) stamps.shift();
    while (stamps.length >= MAX_READS_PER_WINDOW) {
      const waitMs = Math.min(stamps[0] + WINDOW_MS - Date.now() + 25, 10000);
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      const t = Date.now();
      while (stamps.length && stamps[0] <= t - WINDOW_MS) stamps.shift();
    }
    stamps.push(Date.now());
    return run();
  };
  chain = chain.then(exec, exec);
  return chain;
}

const wrappedEntities = new WeakSet();

export function throttleEntityReads(entities) {
  const wrapEntity = (entity) => {
    if (!entity || typeof entity !== "object" || wrappedEntities.has(entity)) return entity;
    wrappedEntities.add(entity);
    for (const op of ["list", "filter", "count", "aggregate"]) {
      if (typeof entity[op] !== "function") continue;
      const original = entity[op];
      entity[op] = (...args) => scheduleRead(() => original.apply(entity, args));
    }
    return entity;
  };

  return new Proxy(entities, {
    get(target, name) {
      const entity = target[name];
      if (typeof entity === "function") return wrapEntity(entity.call(target, name));
      return wrapEntity(entity);
    },
  });
}