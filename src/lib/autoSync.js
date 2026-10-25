import { base44 } from "@/api/base44Client";

let timer = null;

// Fire-and-forget calendar re-sync shortly after a bill/subscription changes.
// Errors are silent here — per-item status chips and the Settings sync show real results.
export function triggerCalendarSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    base44.functions.invoke("calendarSync", {}).catch(() => {});
  }, 4000);
}

let gmailTimer = null;

// Fire-and-forget Gmail scan shortly after the app opens, so new merchant
// emails are found automatically. Errors are silent — Settings shows results.
export function triggerGmailSync() {
  if (gmailTimer) return;
  gmailTimer = setTimeout(() => {
    gmailTimer = null;
    base44.functions.invoke("gmailSync", {}).catch(() => {});
  }, 3000);
}