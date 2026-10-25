export const CURRENCY_SYMBOLS = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", AED: "AED ", JPY: "¥",
};

export function currencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || (code ? code + " " : "₹");
}

export function formatMoney(amount, currency = "INR") {
  const n = Number(amount) || 0;
  const sym = currencySymbol(currency);
  return `${sym}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

const DAYS_IN_CYCLE = { weekly: 7, monthly: 30.44, quarterly: 91.31, annual: 365.25, "one-time": null };

// Convert any cycle's amount into a comparable monthly figure.
export function monthlyEquivalent(amount, cycle) {
  const a = Number(amount) || 0;
  switch (cycle) {
    case "weekly": return a * 52 / 12;
    case "monthly": return a;
    case "quarterly": return a / 3;
    case "annual": return a / 12;
    default: return 0; // one-time payments are not a recurring commitment
  }
}

export function annualEquivalent(amount, cycle) {
  return monthlyEquivalent(amount, cycle) * 12;
}

export function parseDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value).slice(0, 10) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export function daysUntil(dateValue) {
  const d = parseDate(dateValue);
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function isOverdue(dateValue) {
  const d = daysUntil(dateValue);
  return d !== null && d < 0;
}

// Next due date after `fromDate` for a recurring bill whose last due date was dateValue.
export function nextDueDate(dateValue, cycle, fromDate = new Date()) {
  const base = parseDate(dateValue);
  if (!base) return null;
  const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
  if (cycle === "one-time" || !cycle) return base >= from ? base : null;
  let d = new Date(base);
  let guard = 0;
  while (d < from && guard < 600) {
    switch (cycle) {
      case "weekly": d.setDate(d.getDate() + 7); break;
      case "monthly": d.setMonth(d.getMonth() + 1); break;
      case "quarterly": d.setMonth(d.getMonth() + 3); break;
      case "annual": d.setFullYear(d.getFullYear() + 1); break;
      default: return d;
    }
    guard++;
  }
  // JS normalizes month-end overflow (e.g. Jan 31 -> Mar 3); clamp back into the intended month.
  if (cycle === "monthly" || cycle === "quarterly" || cycle === "annual") {
    const monthsPer = cycle === "monthly" ? 1 : cycle === "quarterly" ? 3 : 12;
    const day = base.getDate();
    const probe = new Date(d); probe.setDate(1);
    if (probe.getDate() !== 1) probe.setDate(1);
    if (d.getDate() !== day && d.getDate() < 12) {
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
    }
  }
  return d;
}

export function toDateInput(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : parseDate(d);
  if (!dt) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(d) {
  const dt = parseDate(d);
  if (!dt) return "—";
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}