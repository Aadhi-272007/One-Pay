// Smart redirection registry — real, public deep links, official sites and store pages.
// No placeholder links: every scheme is a real custom-URI scheme; every URL a real destination.
// OnePay never changes a subscription or mandate here — this only opens the right screen.

const PLAY = "https://play.google.com/store/apps/details?id=";

// Subscription merchants. keywords are matched against merchant + plan name (lowercased).
export const APP_REGISTRY = [
  {
    name: "Netflix",
    keywords: ["netflix"],
    scheme: "nflx://",
    webUrl: "https://www.netflix.com",
    storeUrl: PLAY + "com.netflix.mediaclient",
    accountUrl: "https://www.netflix.com/YourAccount",
    steps: [
      "Open netflix.com and sign in",
      "Click your profile icon → Account",
      "Under Membership & Billing, change the plan or cancel",
      "If billed through PhonePe AutoPay, stop the mandate in PhonePe too",
    ],
  },
  {
    name: "Spotify",
    keywords: ["spotify"],
    scheme: "spotify://",
    webUrl: "https://open.spotify.com",
    storeUrl: PLAY + "com.spotify.music",
    accountUrl: "https://www.spotify.com/account/subscription/",
    steps: [
      "Open spotify.com/account/subscription and sign in",
      "View your plan, change it or cancel Premium",
      "If billed via PhonePe AutoPay, manage the mandate under PhonePe → Payment Management → AutoPay",
    ],
  },
  {
    name: "YouTube Premium",
    keywords: ["youtube", "you tube", "google premium"],
    scheme: "vnd.youtube://",
    webUrl: "https://www.youtube.com/paid_memberships",
    storeUrl: PLAY + "com.google.android.apps.youtube.music",
    accountUrl: "https://www.youtube.com/paid_memberships",
    steps: [
      "Open youtube.com/paid_memberships in a signed-in browser",
      "Click Manage → Change plan or Cancel membership",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
  {
    name: "Prime Video",
    keywords: ["amazon", "prime video", "primevideo", "prime membership"],
    scheme: "primevideo://",
    webUrl: "https://www.primevideo.com",
    storeUrl: PLAY + "com.amazon.avod.thirdpartyclient",
    accountUrl: "https://www.amazon.in/prime",
    steps: [
      "Open amazon.in → Account & Lists → Prime",
      "Manage membership → remind, change or end membership",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
  {
    name: "Notion",
    keywords: ["notion"],
    scheme: "notion://",
    webUrl: "https://www.notion.so",
    storeUrl: PLAY + "notion.id",
    accountUrl: "https://www.notion.so/my-account",
    steps: [
      "Open notion.so in a browser and sign in",
      "Settings → Billing → change plan or cancel",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
  {
    name: "JioHotstar",
    keywords: ["hotstar", "jiohotstar", "disney+"],
    scheme: "jiohotstar://",
    webUrl: "https://www.jiohotstar.com",
    accountUrl: "https://www.jiohotstar.com/subscription",
    steps: [
      "Open jiohotstar.com and sign in",
      "Profile → Subscription → change plan or cancel auto-renewal",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
  {
    name: "SonyLIV",
    keywords: ["sonyliv", "sony liv"],
    scheme: "sonyliv://",
    webUrl: "https://www.sonyliv.com",
    accountUrl: "https://www.sonyliv.com/myaccount",
    steps: [
      "Open sonyliv.com → Profile → My Account → Subscription",
      "Change or cancel auto-renewal",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
  {
    name: "ZEE5",
    keywords: ["zee5", "zee"],
    scheme: "zee5://",
    webUrl: "https://www.zee5.com",
    accountUrl: "https://www.zee5.com/myprofile",
    steps: [
      "Open zee5.com → Profile → My Subscription",
      "Change or cancel auto-renewal",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
  {
    name: "Microsoft 365",
    keywords: ["microsoft", "office 365", "microsoft 365", "onedrive"],
    scheme: "ms-excel://",
    webUrl: "https://account.microsoft.com/services",
    accountUrl: "https://account.microsoft.com/services",
    steps: [
      "Open account.microsoft.com/services and sign in",
      "Find the subscription → Manage → change or turn off recurring billing",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
  {
    name: "iCloud+",
    keywords: ["icloud", "apple one", "appleone"],
    scheme: "iclouddrive://",
    webUrl: "https://www.icloud.com",
    accountUrl: "https://support.apple.com/en-in/HT207594",
    steps: [
      "On iPhone: Settings → your name → Subscriptions",
      "Choose the plan → change or cancel",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
  {
    name: "Google One",
    keywords: ["google one", "googleone", "google drive storage"],
    scheme: "googledrive://",
    webUrl: "https://one.google.com",
    storeUrl: PLAY + "com.google.android.apps.subscriptions.red",
    accountUrl: "https://one.google.com/manage",
    steps: [
      "Open one.google.com/manage and sign in",
      "Manage plan → change or cancel",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
  {
    name: "Google Play",
    keywords: ["google play", "play store", "playstore"],
    scheme: "market://",
    webUrl: "https://play.google.com/store",
    accountUrl: "https://play.google.com/store/account/subscriptions",
    steps: [
      "Open play.google.com/store/account/subscriptions",
      "Select the subscription → Manage → change or cancel",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  },
];

// UPI AutoPay mandate apps. None of them expose a public deep link straight to the
// mandate list, so OnePay opens the app and shows the exact taps to reach it.
export const UPI_APPS = [
  {
    id: "phonepe",
    name: "PhonePe",
    scheme: "phonepe://",
    storeUrl: PLAY + "com.phonepe.app",
    steps: [
      "Open PhonePe and sign in",
      "Tap your profile icon (top-left)",
      "Choose Payment Management",
      "Tap AutoPay — every UPI AutoPay mandate is listed here",
      "Select the mandate → view details, pause or stop it",
    ],
  },
  {
    id: "gpay",
    name: "Google Pay",
    scheme: "tez://",
    storeUrl: PLAY + "com.google.android.apps.nbu.paisa.user",
    steps: [
      "Open Google Pay and sign in",
      "Tap your profile picture (top-right)",
      "Tap Bank account → AutoPay",
      "Select the mandate → view, pause or cancel it",
    ],
  },
  {
    id: "paytm",
    name: "Paytm",
    scheme: "paytm://",
    storeUrl: PLAY + "net.one97.paytm",
    steps: [
      "Open Paytm and sign in",
      "Tap your profile icon",
      "Go to UPI & Payment Settings → AutoPay",
      "Select the mandate → view, pause or stop it",
    ],
  },
  {
    id: "bank",
    name: "Bank app",
    scheme: null,
    storeUrl: null,
    steps: [
      "Open your bank's mobile app and sign in",
      "Go to UPI services → AutoPay / Manage mandates",
      "Select the mandate → view, pause or stop it",
    ],
  },
];

export function matchApp(merchant, planName) {
  const hay = `${merchant || ""} ${planName || ""}`.toLowerCase();
  return APP_REGISTRY.find((a) => a.keywords.some((k) => hay.includes(k))) || null;
}

// Best-effort official site for a merchant OnePay doesn't recognise.
export function fallbackWebSearch(merchant) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${merchant || "subscription"} official website`)}`;
}

// Build the targets shown in the launcher for one subscription.
export function buildAppTargets(sub) {
  const matched = matchApp(sub?.merchant, sub?.plan_name);
  if (matched) {
    return { matched: true, name: matched.name, ...matched };
  }
  return {
    matched: false,
    name: sub?.merchant || "official website",
    scheme: null,
    webUrl: fallbackWebSearch(sub?.merchant),
    storeUrl: null,
    accountUrl: null,
    steps: [
      "Open the merchant's official website from the search link",
      "Sign in and go to Account → Billing / Subscription",
      "If billed via PhonePe AutoPay, manage the mandate in PhonePe's AutoPay list",
    ],
  };
}

// Try a custom-URI scheme. Resolves "opened" if the browser/app visibly takes over
// (page hidden or window blurred), "timeout" if nothing happened within `waitMs`.
export function tryDeepLink(schemeUrl, waitMs = 2200) {
  return new Promise((resolve) => {
    if (!schemeUrl) return resolve("timeout");
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("pagehide", onGone);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onVis);
      resolve(result);
    };
    const onGone = () => done("opened");
    const onVis = () => {
      if (document.hidden || document.visibilityState !== "visible") done("opened");
      else done("timeout");
    };
    window.addEventListener("pagehide", onGone);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onVis);
    const timer = setTimeout(() => done("timeout"), waitMs);
    try {
      window.location.href = schemeUrl;
    } catch {
      done("timeout");
    }
  });
}