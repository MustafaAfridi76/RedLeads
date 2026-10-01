import { offerLineOnePrice, relevantOffers, todayStr, toDate, type Lead, type Offer } from "./domain.ts";

// Bump this when the matching prompt or score policy changes.
export const SCORE_POLICY_VERSION = 4;

export function scoreFingerprint(lead: Lead, offers: Offer[], date = todayStr()) {
  const snapshot = JSON.stringify({
    version: SCORE_POLICY_VERSION,
    date,
    lead: {
      brand: lead.brand,
      services: [...lead.services].sort(),
      customer_type: [...lead.customer_type].sort(),
      transcript: lead.transcript.trim(),
      follow_up_date: lead.follow_up_date,
      logged_on: toDate(lead.createdAt)?.toISOString().slice(0, 10) || "",
    },
    offers: relevantOffers(offers, date)
      .map(offer => ({
        id: offer.id,
        title: offer.title,
        description: offer.description,
        brand: offer.brand,
        services: [...offer.services].sort(),
        customer_segments: [...offer.customer_segments].sort(),
        valid_until: offer.valid_until,
        pricing: offer.pricing || "",
        eligibility: offer.eligibility || "",
        data_allowance: offer.data_allowance || "",
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
  // This is a change detector, not a security hash. Keep it synchronous for rescoring.
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < snapshot.length; index++) {
    hash ^= BigInt(snapshot.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

export function planSummary(offer: Offer) {
  const price = offerLineOnePrice(offer);
  return price ? `${offer.title} · ${price} with AutoPay` : offer.title;
}

export function strictBudget(notes: string): number | null {
  const match = notes.match(/\b(?:under|uonder|below|less than|less then)\s*\$?\s*(\d{2,3})(?:\.\d{1,2})?\s*\$?/i);
  return match ? Number(match[1]) : null;
}

export function missesStrictBudget(lead: Lead, offer: Offer) {
  const budget = strictBudget(lead.transcript);
  const price = Number(offerLineOnePrice(offer)?.match(/\d+(?:\.\d+)?/)?.[0]);
  return budget !== null && Number.isFinite(price) && price >= budget;
}
