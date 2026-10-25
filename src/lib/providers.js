// Verified directory of official Indian bill-provider websites and payment portals.
// Rules baked into this file:
//  - A provider is listed ONLY with an official URL; OnePay never opens a guessed site.
//  - Matching is by provider name/alias + bill type agreement, never by category alone.
//  - When no verified link exists, callers must show the "provider not listed" guidance.

export const VERIFIED_AS_OF = "Oct 2026";

export const BILL_TYPES = [
  { id: "electricity", label: "Electricity", needsState: true, bbps: "Electricity" },
  { id: "water", label: "Water", needsState: true, bbps: "Water" },
  { id: "lpg", label: "LPG gas", bbps: "LPG Gas" },
  { id: "piped_gas", label: "Piped gas", needsState: true, bbps: "Piped Gas" },
  { id: "petrol", label: "Petrol / petroleum", bbps: null },
  { id: "society", label: "Housing society maintenance", bbps: null },
  { id: "internet", label: "Internet / broadband", bbps: "Broadband" },
  { id: "mobile", label: "Mobile postpaid", bbps: "Mobile Postpaid" },
  { id: "credit_card", label: "Credit card", bbps: "Credit Card" },
  { id: "insurance", label: "Insurance premium", bbps: "Insurance" },
  { id: "other", label: "Other", bbps: null },
];

// Every URL below is an official domain of the provider (no aggregators except
// the provider's own portal). appScheme is included only where the scheme is real.
export const PROVIDERS = [
  // Electricity
  { id: "tangedco", name: "TANGEDCO (Tamil Nadu)", billType: "electricity", states: ["Tamil Nadu"], aliases: ["tangedco", "tneb", "tamil nadu electricity"], url: "https://www.tangedco.gov.in", note: "Open the official site → pay on the TANGEDCO online portal with your consumer number." },
  { id: "msedcl", name: "MSEDCL (Maharashtra)", billType: "electricity", states: ["Maharashtra"], aliases: ["msedcl", "mahadiscom", "maharashtra electricity"], url: "https://www.mahadiscom.in", note: "Open the official site → Bill Payment → pay with your consumer number." },
  { id: "bses", name: "BSES (Delhi)", billType: "electricity", states: ["Delhi"], aliases: ["bses", "brpl", "bypl"], url: "https://www.bsesdelhi.com", note: "Open the official site → Pay Bill → enter your CA number." },
  { id: "tatapower_ddl", name: "Tata Power-DDL (Delhi)", billType: "electricity", states: ["Delhi"], aliases: ["tata power ddl", "tatapower-ddl", "north delhi power"], url: "https://www.tatapower-ddl.com", note: "Open the official site → Pay Online with your CA number." },
  { id: "bescom", name: "BESCOM (Karnataka)", billType: "electricity", states: ["Karnataka"], aliases: ["bescom", "karnataka electricity"], url: "https://bescom.co.in", note: "Open the official site → NCHP/Solar & Online Payment → pay with your account ID." },
  { id: "cesc", name: "CESC (West Bengal)", billType: "electricity", states: ["West Bengal"], aliases: ["cesc", "west bengal electricity"], url: "https://www.cesc.co.in", note: "Open the official site → Pay Online with your consumer number." },
  { id: "uppcl", name: "UPPCL (Uttar Pradesh)", billType: "electricity", states: ["Uttar Pradesh"], aliases: ["uppcl", "uttar pradesh electricity"], url: "https://www.uppcl.org", note: "Open the official site → Online Payment with your consumer number." },
  { id: "torrentpower", name: "Torrent Power", billType: "electricity", states: ["Gujarat", "Maharashtra", "Uttar Pradesh"], aliases: ["torrent power", "torrentpower"], url: "https://www.torrentpower.com", note: "Open the official site → Payments → pay with your account number." },
  { id: "pspcl", name: "PSPCL (Punjab)", billType: "electricity", states: ["Punjab"], aliases: ["pspcl", "punjab electricity"], url: "https://pspcl.in", note: "Open the official site → Bill Payment with your account number." },
  { id: "ugvcl", name: "UGVCL (Gujarat)", billType: "electricity", states: ["Gujarat"], aliases: ["ugvcl", "uttar gujarat electricity"], url: "https://www.ugvcl.com", note: "Open the official site → Online Bill Payment." },

  // Water
  { id: "cmwssb", name: "Chennai Metro Water (CMWSSB)", billType: "water", states: ["Tamil Nadu"], aliases: ["chennai metro water", "cmwssb", "metro water"], url: "https://chennaimetrowater.tn.gov.in", note: "Open the official site → Online Payment → water charges with your connection number." },
  { id: "bwssb", name: "BWSSB (Bengaluru)", billType: "water", states: ["Karnataka"], aliases: ["bwssb", "bengaluru water", "bangalore water"], url: "https://bwssb.gov.in", note: "Open the official site → pay with your RR number." },
  { id: "djb", name: "Delhi Jal Board", billType: "water", states: ["Delhi"], aliases: ["delhi jal board", "djb", "jal board"], url: "https://djb.gov.in", note: "Open the official site → pay with your consumer number (KNO)." },
  { id: "mcgm", name: "Brihanmumbai Municipal Water (BMC)", billType: "water", states: ["Maharashtra"], aliases: ["bmc", "mcgm", "mumbai water"], url: "https://portal.mcgm.gov.in", note: "Open the official portal → Citizen Services → water bill payment." },

  // LPG
  { id: "indane", name: "Indane (IndianOil)", billType: "lpg", states: [], aliases: ["indane", "indianoil", "indian oil"], url: "https://iocl.com", note: "Book and pay on the official IndianOil site/app with your LPG ID." },
  { id: "hpgas", name: "HP Gas", billType: "lpg", states: [], aliases: ["hp gas", "hpgas", "hpcl"], url: "https://www.hpgas.hpcl.co.in", note: "Open the official HP Gas portal → book a cylinder / pay online." },
  { id: "bharatgas", name: "Bharat Gas (BPCL)", billType: "lpg", states: [], aliases: ["bharatgas", "bharat gas", "bpcl"], url: "https://www.bharatgas.in", note: "Open the official Bharat Gas site → book and pay with your LPG ID." },

  // Piped gas
  { id: "igl", name: "IGL (Delhi NCR)", billType: "piped_gas", states: ["Delhi", "Uttar Pradesh", "Haryana"], aliases: ["igl", "indraprastha gas"], url: "https://www.iglonline.net", note: "Open the official site → pay your PNG bill with your BP number." },
  { id: "mgl", name: "Mahanagar Gas (Mumbai)", billType: "piped_gas", states: ["Maharashtra"], aliases: ["mahanagar gas", "mahanagaragas"], url: "https://www.mahanagaragas.com", note: "Open the official site → pay your PNG bill with your customer ID." },
  { id: "gujaratgas", name: "Gujarat Gas", billType: "piped_gas", states: ["Gujarat"], aliases: ["gujarat gas", "gujaratgas"], url: "https://www.gujaratgas.com", note: "Open the official site → pay your PNG bill with your customer ID." },

  // Petrol / petroleum services
  { id: "iocl_fuel", name: "IndianOil (fuel & cards)", billType: "petrol", states: [], aliases: ["indianoil fuel", "xp100", "indian oil card"], url: "https://iocl.com", note: "Petrol stations don't issue bills — pay at the pump; fuel cards are managed on this official portal." },
  { id: "hpcl_fuel", name: "HPCL (fuel & cards)", billType: "petrol", states: [], aliases: ["hpcl fuel", "hp pay", "hindustan petroleum"], url: "https://www.hindustanpetroleum.com", note: "Petrol stations don't issue bills — pay at the pump; fuel cards are managed on this official portal." },
  { id: "bpcl_fuel", name: "BPCL (fuel & cards)", billType: "petrol", states: [], aliases: ["bpcl fuel", "bharat petroleum card"], url: "https://www.bharatpetroleum.in", note: "Petrol stations don't issue bills — pay at the pump; fuel cards are managed on this official portal." },

  // Housing society maintenance
  { id: "nobroker_society", name: "NoBroker Society", billType: "society", states: [], aliases: ["nobroker", "no broker society"], url: "https://www.nobroker.in", note: "Open NoBroker → your society → Maintenance → pay the dues." },
  { id: "mygate", name: "MyGate", billType: "society", states: [], aliases: ["mygate", "my gate"], url: "https://www.mygate.com", note: "Open MyGate → Payments → Maintenance → pay the dues." },
  { id: "apnacomplex", name: "ApnaComplex", billType: "society", states: [], aliases: ["apnacomplex", "apna complex"], url: "https://www.apnacomplex.com", note: "Open ApnaComplex → Payments → pay your maintenance invoice." },
  { id: "adda", name: "ADDA", billType: "society", states: [], aliases: ["adda society", "adda.in"], url: "https://www.adda.in", note: "Open ADDA → Payments → pay your maintenance invoice." },

  // Internet / broadband
  { id: "act_fibernet", name: "ACT Fibernet", billType: "internet", states: [], aliases: ["act fibernet", "act broadband", "actcorp"], url: "https://www.actcorp.in", note: "Open the official site → Pay Online with your username." },
  { id: "airtel_broadband", name: "Airtel Broadband", billType: "internet", states: [], aliases: ["airtel broadband", "airtel fiber", "airtel xstream"], url: "https://www.airtel.in", note: "Open the official site → Broadband → Pay Bill with your landline/ID." },
  { id: "jio_fiber", name: "JioFiber", billType: "internet", states: [], aliases: ["jiofiber", "jio fiber", "jio broadband"], url: "https://www.jio.com", note: "Open the official site → Broadband → Pay Bill with your service ID." },
  { id: "bsnl_broadband", name: "BSNL", billType: "internet", states: [], aliases: ["bsnl"], url: "https://bsnl.co.in", note: "Open the official BSNL portal → pay with your landline/customer ID." },
  { id: "tataplayfiber", name: "Tata Play Fiber", billType: "internet", states: [], aliases: ["tata play fiber", "tataplayfiber", "tata sky broadband"], url: "https://www.tataplayfiber.com", note: "Open the official site → Pay Bill with your account ID." },
  { id: "hathway", name: "Hathway", billType: "internet", states: [], aliases: ["hathway"], url: "https://www.hathway.com", note: "Open the official site → Quick Bill Payment." },
  { id: "excitel", name: "Excitel", billType: "internet", states: [], aliases: ["excitel"], url: "https://www.excitel.com", note: "Open the official site → Pay Online." },

  // Mobile postpaid
  { id: "airtel_mobile", name: "Airtel Mobile", billType: "mobile", states: [], aliases: ["airtel postpaid", "airtel mobile"], url: "https://www.airtel.in", note: "Open the official site → Postpaid → Pay Bill with your mobile number." },
  { id: "jio_mobile", name: "Jio Postpaid", billType: "mobile", states: [], aliases: ["jio postpaid", "jio mobile"], url: "https://www.jio.com", note: "Open the official site → Postpaid → Pay Bill with your mobile number." },
  { id: "vi_mobile", name: "Vi (Vodafone Idea)", billType: "mobile", states: [], aliases: ["vodafone idea", "vodafone", "idea postpaid", "myvi"], url: "https://www.myvi.in", note: "Open the official Vi site → Postpaid → Pay Bill with your mobile number." },
  { id: "bsnl_mobile", name: "BSNL Mobile", billType: "mobile", states: [], aliases: ["bsnl postpaid", "bsnl mobile"], url: "https://bsnl.co.in", note: "Open the official BSNL portal → pay with your mobile number." },

  // Credit cards
  { id: "sbicard", name: "SBI Card", billType: "credit_card", states: [], aliases: ["sbi card", "sbicard", "state bank card"], url: "https://www.sbicard.com", note: "Open the official SBI Card site → Pay → pay the card bill." },
  { id: "icici_card", name: "ICICI Bank credit card", billType: "credit_card", states: [], aliases: ["icici card", "icici credit"], url: "https://www.icicibank.com", note: "Open the official ICICI site → Credit Cards → pay the bill." },
  { id: "hdfc_card", name: "HDFC Bank credit card", billType: "credit_card", states: [], aliases: ["hdfc card", "hdfc credit"], url: "https://www.hdfcbank.com", note: "Open the official HDFC site → Credit Cards → pay the bill." },
  { id: "axis_card", name: "Axis Bank credit card", billType: "credit_card", states: [], aliases: ["axis card", "axis credit"], url: "https://www.axisbank.com", note: "Open the official Axis site → Credit Cards → pay the bill." },
  { id: "kotak_card", name: "Kotak credit card", billType: "credit_card", states: [], aliases: ["kotak card", "kotak credit"], url: "https://www.kotak.com", note: "Open the official Kotak site → Credit Cards → pay the bill." },
  { id: "amex_card", name: "American Express card", billType: "credit_card", states: [], aliases: ["american express", "amex card", "amex credit"], url: "https://www.americanexpress.com", note: "Open the official Amex site → pay the card bill." },
  { id: "idfc_card", name: "IDFC FIRST credit card", billType: "credit_card", states: [], aliases: ["idfc card", "idfc credit", "idfc first"], url: "https://www.idfcfirstbank.com", note: "Open the official IDFC FIRST site → Credit Cards → pay the bill." },
  { id: "icici_cc_bill", name: "ICICI Bank", billType: "credit_card", states: [], aliases: ["icici bank"], url: "https://www.icicibank.com", note: "Open the official ICICI site → pay your card or account bill." },

  // Insurance
  { id: "lic", name: "LIC of India", billType: "insurance", states: [], aliases: ["lic india", "life insurance corporation", "lic premium"], url: "https://licindia.in", note: "Open the official LIC site → Online Payment → premium with your policy number." },
  { id: "bajajallianz", name: "Bajaj Allianz", billType: "insurance", states: [], aliases: ["bajaj allianz", "bajajallianz"], url: "https://www.bajajallianz.com", note: "Open the official site → Customer Portal → pay the premium." },
  { id: "hdfclife", name: "HDFC Life", billType: "insurance", states: [], aliases: ["hdfc life", "hdfclife"], url: "https://www.hdfclife.com", note: "Open the official site → Pay Premium with your policy number." },
  { id: "icicipru", name: "ICICI Prudential Life", billType: "insurance", states: [], aliases: ["icici prudential", "iciciprulife"], url: "https://www.iciciprulife.com", note: "Open the official site → Pay Premium with your policy number." },
  { id: "starhealth", name: "Star Health", billType: "insurance", states: [], aliases: ["star health", "starhealth"], url: "https://www.starhealth.in", note: "Open the official site → Renew / pay the premium." },
  { id: "sbilife", name: "SBI Life", billType: "insurance", states: [], aliases: ["sbi life", "sbilife"], url: "https://www.sbilife.co.in", note: "Open the official site → Pay Premium with your policy number." },
];

// How to pay once the official page is open, per bill type.
export const PAY_STEPS = {
  electricity: ["Open the official portal (or the provider's own app)", "Sign in or enter your consumer number from the bill", "Check the billed amount, then pay by UPI, card or net banking"],
  water: ["Open the official board portal", "Enter your connection/consumer number from the bill", "Check the billed amount, then pay online"],
  lpg: ["Open the official LPG portal or the oil company's app", "Enter your LPG ID / registered number", "Book the cylinder or pay the dues"],
  piped_gas: ["Open the official gas company portal", "Enter your customer/BP number from the bill", "Check the billed amount, then pay online"],
  petrol: ["Fuel is paid at the pump by UPI or card", "Fuel cards are managed on the oil company's official portal"],
  society: ["Open your society's app or portal", "Go to Payments / Maintenance dues", "Pay the invoice and keep the receipt"],
  internet: ["Open the official provider site", "Sign in or enter your account ID from the bill", "Pay the bill by UPI, card or net banking"],
  mobile: ["Open the official operator site", "Enter your mobile number", "Pay the postpaid bill"],
  credit_card: ["Open the official card site or app", "Sign in and pick the card", "Pay the outstanding bill by net banking or UPI"],
  insurance: ["Open the official insurer portal", "Enter your policy number", "Pay the premium and download the receipt"],
  other: ["Open the provider's official site or app", "Sign in and find the bill payment section", "Pay and keep the receipt"],
};

const TYPE_RULES = [
  ["electricity", ["electricity", "electric", "tangedco", "tneb", "power", "bescom", "msedcl", "discom", "torrent"]],
  ["water", ["water", "jal board", "bwssb", "metro water", "cmwssb"]],
  ["lpg", ["lpg", "gas cylinder", "indane", "bharatgas", "bharat gas", "hp gas", "hpgas"]],
  ["piped_gas", ["piped gas", "png", "igl", "indraprastha", "mahanagar gas", "gujarat gas"]],
  ["petrol", ["petrol", "fuel", "diesel", "hpcl", "bharat petroleum", "hindustan petroleum", "xp100"]],
  ["society", ["society", "maintenance", "apartment", "housing", "mygate", "nobroker", "apnacomplex", "adda"]],
  ["internet", ["internet", "broadband", "fiber", "fibre", "wifi", "wi-fi", "actcorp"]],
  ["mobile", ["mobile", "postpaid", "recharge", "telecom"]],
  ["credit_card", ["credit card", "creditcard", "card bill", "sbicard", "amex"]],
  ["insurance", ["insurance", "premium", "lic", "policy"]],
];

// Detect the bill type from category + title + merchant text.
export function detectBillType(bill) {
  const hay = `${bill?.category || ""} ${bill?.title || ""} ${bill?.merchant || ""}`.toLowerCase();
  for (const [type, kws] of TYPE_RULES) {
    if (kws.some((k) => hay.includes(k))) return type;
  }
  return bill?.category === "Subscriptions" ? "other" : null;
}

// Match the exact provider. A match requires a name/alias hit, length>=5 to avoid
// false positives, and (when the type is known) agreement with the bill type.
export function matchProvider(bill) {
  const type = detectBillType(bill);
  const hay = `${bill?.merchant || ""} ${bill?.title || ""}`.toLowerCase();
  const aliasHit = PROVIDERS.find((p) =>
    [...(p.aliases || []), p.name.toLowerCase()].some((a) => a.length >= 5 && hay.includes(a))
  );
  if (aliasHit && (!type || aliasHit.billType === type || type === "other")) {
    return { type, provider: aliasHit, needsSelection: false };
  }
  return { type, provider: null, needsSelection: true, typeKnown: !!type };
}

// States that have verified providers for a bill type.
export function statesFor(type) {
  const states = new Set();
  for (const p of PROVIDERS) if (p.billType === type) p.states.forEach((s) => states.add(s));
  return [...states].sort();
}

export function providersFor(type, state) {
  return PROVIDERS.filter((p) => p.billType === type && (!state || p.states.length === 0 || p.states.includes(state)));
}

export function billTypeLabel(type) {
  return BILL_TYPES.find((t) => t.id === type)?.label || type;
}

// Steps to pay any bill of this type through BBPS inside PhonePe / Google Pay.
export function buildBbpsSteps(bbpsLabel) {
  if (!bbpsLabel) return null;
  return [
    "Open PhonePe (or Google Pay) and sign in",
    `Tap Recharge & Pay Bills → ${bbpsLabel}`,
    "Choose your provider from the list",
    "Enter the consumer/account number from your bill",
    "Check the amount, then pay",
  ];
}