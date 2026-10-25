// UPI payment intent helpers — real UPI deep links per the NPCI UPI URI standard.
// A UPI intent is an instruction to pay; it never confirms anything. Only the
// payer's UPI app (or its bank statement) can confirm a transaction actually happened.

export const UPI_APPS = [
  { id: "phonepe", name: "PhonePe", scheme: "phonepe://pay", tone: "bg-violet-600" },
  { id: "gpay", name: "Google Pay", scheme: "tez://upi/pay", tone: "bg-emerald-600" },
  { id: "paytm", name: "Paytm", scheme: "paytmmp://pay", tone: "bg-sky-600" },
  { id: "any", name: "Any UPI app", scheme: "upi://pay", tone: "bg-blue-600" },
];

export function isValidUpiId(vpa) {
  return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test((vpa || "").trim());
}

export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function newUpiRef() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ONP${t}${r}`.slice(0, 35);
}

// Builds a UPI payment URI. scheme picks the app-specific intent
// (phonepe://pay, tez://upi/pay, paytmmp://pay) or the generic upi://pay.
export function buildUpiUri({ vpa, name, amount, reference, note }, scheme = "upi://pay") {
  const params = new URLSearchParams({
    pa: (vpa || "").trim(),
    pn: (name || "").trim().slice(0, 40),
    am: Number(amount).toFixed(2),
    cu: "INR",
  });
  if (reference) params.set("tr", reference);
  if (note) params.set("tn", String(note).slice(0, 49));
  return `${scheme}?${params.toString()}`;
}

// Attempts to open the UPI app. Browsers give no reliable signal for
// "app missing" — the user simply picks another app if nothing opened.
export function launchUpiApp(uri) {
  window.location.href = uri;
}