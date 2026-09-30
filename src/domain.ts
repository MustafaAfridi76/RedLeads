import type { Timestamp } from "firebase/firestore";

export type Brand = "bell" | "virgin" | "both";
export type OfferBrand = Brand;
export type SelectableBrand = Exclude<Brand, "both">;
export type Service =
  "internet" | "byod" | "phone" | "multiline" | "subscription" | "giftcard";
export type CustomerType =
  "consumer" | "epp" | "small_business" | "student" | "p2p";
export type LeadStatus = "active" | "won" | "lost";
export type ActivityType = "call" | "message" | "status" | "rescore";
export type Stamp = Timestamp | Date | null;

export type Lead = {
  id: string;
  userId: string;
  customer_name: string;
  phone: string;
  email: string;
  brand: Brand;
  services: Service[];
  customer_type: CustomerType[];
  transcript: string;
  keywords: string[];
  close_requirements: string;
  follow_up_date: string;
  heat_score: number | null;
  heat_reason: string;
  matched_offer: string;
  matched_offers: string[];
  scored_date: string;
  status: LeadStatus;
  outcome_reason: string;
  last_message: string;
  createdAt: Stamp;
  updatedAt: Stamp;
};
export type LeadInput = Pick<
  Lead,
  | "customer_name"
  | "phone"
  | "email"
  | "brand"
  | "services"
  | "customer_type"
  | "transcript"
  | "follow_up_date"
>;
export type Offer = {
  id: string;
  title: string;
  description: string;
  brand: OfferBrand;
  services: Service[];
  customer_segments: CustomerType[];
  valid_until: string;
  plan_code?: string;
  data_allowance?: string;
  eligibility?: string;
  pricing?: string;
  source_file?: string;
  source_page?: number;
  source_date?: string;
  offer_key?: string;
  source_group?: string;
  active?: boolean;
  createdAt: Stamp;
  updatedAt: Stamp;
};
export type OfferInput = Omit<Offer, "id" | "createdAt" | "updatedAt">;
export type Activity = {
  id: string;
  lead_id: string;
  type: ActivityType;
  note: string;
  createdAt: Stamp;
};

export const SERVICES: {
  id: Service;
  label: string;
  icon: string;
  highValue?: boolean;
}[] = [
  { id: "internet", label: "Internet", icon: "Wifi" },
  { id: "byod", label: "BYOD", icon: "SmartphoneCharging" },
  { id: "phone", label: "Phone", icon: "Smartphone" },
  { id: "multiline", label: "Multi-line", icon: "Users", highValue: true },
  { id: "subscription", label: "Subscriptions", icon: "Tv" },
  { id: "giftcard", label: "Gift card", icon: "Gift" },
];
export const CUSTOMER_TYPES: { id: CustomerType; label: string }[] = [
  { id: "consumer", label: "Consumer" },
  { id: "epp", label: "EPP" },
  { id: "small_business", label: "Small business" },
  { id: "student", label: "Student" },
  { id: "p2p", label: "P2P" },
];
export const BRANDS: { id: SelectableBrand; label: string }[] = [
  { id: "bell", label: "Bell" },
  { id: "virgin", label: "Virgin Plus" },
];
export const CLOSE_HINTS = [
  "Wants a cheaper monthly plan",
  "Needs a better gift card",
  "Waiting for a device lease price to drop",
  "Wants faster internet for the same price",
];
export const WON_REASONS = [
  "Loved the offer",
  "Gift card sealed it",
  "Upgraded their device",
  "Multi-line switch",
  "Price match worked",
];
export const LOST_REASONS = [
  "Price too high",
  "Went with competitor",
  "Bad timing",
  "Just browsing",
  "Unreachable",
];
export const EXCLUDED_OFFER =
  /\btablet\b|\bsmart\s*watch\b|\bwatch\b|\bpush[- ]to[- ]talk\b|\bptt\b|\bconnected car\b|\bhome phone\b|\bvoice[- ]only\b|\bno[- ]data\b|\b0\s*(?:mb|gb)\b|\bdata[- ]less\b/i;
export const DICTIONARY =
  /\$\s?\d+(?:\.\d+)?|\b\d+\s?(?:dollars|bucks|gigs|gb)\b|cheaper|price|discount|deal|gift\s?card|iphone(?:\s?\d+)?|galaxy|pixel|lease|financ\w*|contract|upgrade|switch\w*|rogers|telus|freedom|fido|koodo|fibre|fiber|speed|unlimited|data|streaming|crave|family|budget|promo\w*|trade-in|cancel\w*/gi;

export const todayStr = () => new Date().toLocaleDateString("en-CA");
export function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
}
export function toDate(value: Stamp | string | undefined): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return value instanceof Date ? value : value.toDate();
}
export function dateText(
  value: Stamp | string | undefined,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) {
  const date = toDate(value);
  return date ? date.toLocaleDateString(undefined, options) : "No date";
}
export function shortDateTime(value: Stamp | string | undefined) {
  const date = toDate(value);
  return date
    ? date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
}
export function heatTier(score: number | null) {
  return score == null
    ? "pending"
    : score >= 70
      ? "hot"
      : score >= 40
        ? "warm"
        : "cold";
}
export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10
    ? `+1${digits}`
    : digits.length === 11 && digits.startsWith("1")
      ? `+${digits}`
      : phone.trim();
}
export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : phone;
}
export function relevantOffers(offers: Offer[], date = todayStr()) {
  return offers.filter(
    (o) =>
      o.active !== false &&
      (!o.valid_until || o.valid_until >= date) &&
      isSupportedOffer(o),
  );
}

export function offerSourceGroup(fileName: string) {
  return fileName.toLowerCase().replace(/\.pdf$/i, '')
    .replace(/\b(?:20\d{2}[-_. ]\d{1,2}[-_. ]\d{1,2}|\d{1,2}[-_. ]\d{1,2}[-_. ](?:20)?\d{2})\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export function isSupportedOffer(offer: OfferInput) {
  if (/^lucky\b/i.test(offer.title.trim())) return false;
  if (EXCLUDED_OFFER.test(`${offer.title} ${offer.data_allowance || ""}`)) return false;
  const data = offer.data_allowance?.trim();
  if (data && /^(?:-|none|n\/a|0|no data)$/i.test(data)) return false;
  // Descriptions can mention exclusions (for example "not a tablet plan").
  // The product title and data allowance identify the actual plan type.
  if (/talk\s*(?:&|and|n)\s*text|\bbasic\b/i.test(offer.title) &&
      !/\b[1-9]\d*(?:\.\d+)?\s*(?:gb|mb)\b|unlimited\s+data/i.test(`${data || ""} ${offer.description}`)) return false;
  return true;
}

export function offerMatchesLead(offer: Offer, lead: Lead) {
  return isSupportedOffer(offer) &&
    (!/mobile internet/i.test(offer.title) || /mobile internet|hotspot|data[- ]only/i.test(lead.transcript)) &&
    (!offer.valid_until || offer.valid_until >= todayStr()) &&
    (offer.brand === 'both' || lead.brand === 'both' || offer.brand === lead.brand) &&
    offer.services.some(service => lead.services.includes(service)) &&
    (!offer.customer_segments.length || offer.customer_segments.some(segment => lead.customer_type.includes(segment)));
}

export function offerLineOnePrice(offer: Offer): string | null {
  const match = offer.pricing?.match(/\bLine\s*1(?:\s*net\s*price)?\s*:?\s*\$\s*(\d+(?:\.\d{1,2})?)/i);
  return match ? `$${match[1]}/mo` : null;
}
