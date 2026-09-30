import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  addDays,
  normalizePhone,
  todayStr,
  toDate,
  type Activity,
  type ActivityType,
  type Brand,
  type CustomerType,
  type Lead,
  type LeadInput,
  type LeadStatus,
  type Offer,
  type OfferInput,
  type Service,
  offerSourceGroup,
} from "./domain";

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");
  return user;
}
function owner(lead: Lead) {
  if (lead.userId !== requireUser().uid)
    throw new Error("This lead is not yours.");
}
const stamp = (data: DocumentData, key: string) => data[key] || null;

// Existing Expo leads remain visible. New fields take precedence when present.
export function asLead(id: string, data: DocumentData): Lead {
  const oldCategories: string[] = Array.isArray(data.categories)
    ? data.categories
    : data.category
      ? [data.category]
      : [];
  const legacyServices: Service[] = oldCategories
    .map((value) =>
      value === "brs" ? "internet" : value === "postpaid" ? "phone" : value,
    )
    .filter((value): value is Service =>
      [
        "internet",
        "byod",
        "phone",
        "multiline",
        "subscription",
        "giftcard",
      ].includes(value),
    );
  const oldStatus =
    data.status === "closed"
      ? "won"
      : data.status === "killed"
        ? "lost"
        : "active";
  const followUp =
    data.follow_up_date ||
    (data.nextFollowUpAt?.toDate
      ? data.nextFollowUpAt.toDate().toLocaleDateString("en-CA")
      : addDays(3));
  return {
    id,
    userId: data.userId || "",
    customer_name: data.customer_name || data.name || "",
    phone: data.phone || "",
    email: data.email || "",
    brand: data.brand === "virgin" ? "virgin" : "bell",
    services: Array.isArray(data.services) ? data.services : legacyServices,
    customer_type: Array.isArray(data.customer_type)
      ? data.customer_type
      : ["consumer"],
    transcript: data.transcript || data.notes || "",
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    close_requirements: data.close_requirements || "",
    follow_up_date: followUp,
    heat_score:
      typeof data.heat_score === "number"
        ? data.heat_score
        : typeof data.heatScore === "number"
          ? data.heatScore
          : null,
    heat_reason: data.heat_reason || "",
    matched_offer: data.matched_offer || "",
    matched_offers: Array.isArray(data.matched_offers)
      ? data.matched_offers.filter((title: unknown): title is string => typeof title === "string").slice(0, 2)
      : data.matched_offer ? [data.matched_offer] : [],
    scored_date: data.scored_date || "",
    status: (["active", "won", "lost"].includes(data.status)
      ? data.status
      : oldStatus) as LeadStatus,
    outcome_reason: data.outcome_reason || "",
    last_message: data.last_message || data.lastGeneratedMessage || "",
    createdAt: stamp(data, "createdAt"),
    updatedAt: stamp(data, "updatedAt"),
  };
}
export function asOffer(id: string, data: DocumentData): Offer {
  return {
    id,
    title: data.title || "",
    description: data.description || "",
    brand: ["bell", "virgin", "both"].includes(data.brand)
      ? data.brand
      : "both",
    services: Array.isArray(data.services) ? data.services : [],
    customer_segments: Array.isArray(data.customer_segments)
      ? data.customer_segments
      : [],
    valid_until: data.valid_until || "",
    plan_code: data.plan_code || "",
    data_allowance: data.data_allowance || "",
    eligibility: data.eligibility || "",
    pricing: data.pricing || "",
    source_file: data.source_file || "",
    source_page: data.source_page || 0,
    source_date: data.source_date || "",
    offer_key: data.offer_key || "",
    source_group: data.source_group || offerSourceGroup(data.source_file || ""),
    active: data.active !== false,
    createdAt: stamp(data, "createdAt"),
    updatedAt: stamp(data, "updatedAt"),
  };
}
export function watchLeads(
  uid: string,
  onData: (items: Lead[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "leads"), where("userId", "==", uid)),
    (snap) =>
      onData(
        snap.docs
          .map((d) => asLead(d.id, d.data()))
          .sort(
            (a, b) =>
              (toDate(b.createdAt)?.getTime() || 0) -
              (toDate(a.createdAt)?.getTime() || 0),
          ),
      ),
    onError,
  );
}
export function watchOffers(
  onData: (items: Offer[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  requireUser();
  return onSnapshot(
    collection(db, "offers"),
    (snap) =>
      onData(
        snap.docs
          .map((d) => asOffer(d.id, d.data()))
          .filter((offer) => offer.active !== false)
          .sort((a, b) => a.title.localeCompare(b.title)),
      ),
    onError,
  );
}
export function watchActivity(
  lead: Lead,
  onData: (items: Activity[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  owner(lead);
  return onSnapshot(
    query(
      collection(db, "leads", lead.id, "activity"),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
    (snap) =>
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          lead_id: lead.id,
          type: d.data().type,
          note: d.data().note || "",
          createdAt: d.data().createdAt || null,
        })),
      ),
    onError,
  );
}
export async function logActivity(
  lead: Lead,
  type: ActivityType,
  note: string,
) {
  try {
    owner(lead);
    await addDoc(collection(db, "leads", lead.id, "activity"), {
      type,
      note: note.slice(0, 200),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Activity could not be saved:", error);
  }
}
export async function createLead(input: LeadInput) {
  const user = requireUser();
  if (!input.customer_name.trim() || !input.phone.trim())
    throw new Error("Name and phone are required.");
  return addDoc(collection(db, "leads"), {
    ...input,
    customer_name: input.customer_name.trim(),
    phone: normalizePhone(input.phone),
    email: input.email.trim(),
    transcript: input.transcript.trim(),
    userId: user.uid,
    keywords: [],
    close_requirements: "",
    heat_score: null,
    heat_reason: "",
    matched_offer: "",
    matched_offers: [],
    scored_date: "",
    status: "active",
    outcome_reason: "",
    last_message: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateLead(lead: Lead, input: LeadInput) {
  owner(lead);
  await updateDoc(doc(db, "leads", lead.id), {
    ...input,
    customer_name: input.customer_name.trim(),
    phone: normalizePhone(input.phone),
    email: input.email.trim(),
    transcript: input.transcript.trim(),
    scored_date: "",
    updatedAt: serverTimestamp(),
  });
}
export async function updateLeadStatus(
  lead: Lead,
  status: LeadStatus,
  reason = "",
) {
  owner(lead);
  await updateDoc(doc(db, "leads", lead.id), {
    status,
    outcome_reason: reason.trim(),
    scored_date: status === "active" ? "" : lead.scored_date,
    updatedAt: serverTimestamp(),
  });
  void logActivity(
    lead,
    "status",
    status === "active"
      ? "Lead reopened"
      : `Marked ${status}${reason ? ` — ${reason}` : ""}`,
  );
}
export async function deleteLead(lead: Lead) {
  owner(lead);
  const activities = await getDocs(
    collection(db, "leads", lead.id, "activity"),
  );
  const batch = writeBatch(db);
  activities.docs.forEach((item) => batch.delete(item.ref));
  batch.delete(doc(db, "leads", lead.id));
  await batch.commit();
}
export async function saveLeadScore(
  lead: Lead,
  result: {
    heat_score: number;
    heat_reason: string;
    matched_offer: string;
    matched_offers: string[];
    keywords: string[];
    close_requirements: string;
  },
  date = todayStr(),
) {
  owner(lead);
  await updateDoc(doc(db, "leads", lead.id), {
    ...result,
    scored_date: date,
    updatedAt: serverTimestamp(),
  });
}
export async function saveMessage(lead: Lead, message: string) {
  owner(lead);
  await updateDoc(doc(db, "leads", lead.id), {
    last_message: message.trim().slice(0, 320),
    updatedAt: serverTimestamp(),
  });
  void logActivity(lead, "message", `Drafted: ${message.trim().slice(0, 100)}`);
}
export async function createOffer(input: OfferInput) {
  requireUser();
  if (!input.title.trim()) throw new Error("Offer title is required.");
  return addDoc(collection(db, "offers"), {
    ...input,
    title: input.title.trim().slice(0, 200),
    description: input.description.trim().slice(0, 1200),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateOffer(offer: Offer, input: OfferInput) {
  requireUser();
  await updateDoc(doc(db, "offers", offer.id), {
    ...input,
    title: input.title.trim().slice(0, 200),
    description: input.description.trim().slice(0, 1200),
    updatedAt: serverTimestamp(),
  });
}
export async function deleteOffer(offer: Offer) {
  requireUser();
  await deleteDoc(doc(db, "offers", offer.id));
}
export async function upsertOffers(inputs: OfferInput[], existing: Offer[]) {
  requireUser();
  const batch = writeBatch(db);
  let created = 0, updated = 0, retired = 0;
  const group = offerSourceGroup(inputs[0]?.source_file || '');
  const matchedIds = new Set<string>();
  const lineOne = (pricing?: string) => pricing?.match(/Line 1(?: net price)?:?\s*\$(\d+)/i)?.[1] || '';
  for (const input of inputs) {
    const found = existing.find(
      (o) => !matchedIds.has(o.id) &&
      (o.source_group || offerSourceGroup(o.source_file || '')) === group &&
      ((input.offer_key && o.offer_key === input.offer_key) ||
        (input.source_file && input.plan_code && o.source_file === input.source_file &&
          input.source_page === o.source_page && input.plan_code === o.plan_code &&
          input.customer_segments.slice().sort().join(',') === o.customer_segments.slice().sort().join(',') &&
          lineOne(input.pricing) === lineOne(o.pricing)) ||
        o.title.trim().toLowerCase() === input.title.trim().toLowerCase()),
    );
    if (found) {
      matchedIds.add(found.id);
      batch.update(doc(db, 'offers', found.id), {...input, source_group:group, active:true, updatedAt:serverTimestamp()});
      updated++;
    } else {
      batch.set(doc(collection(db, 'offers')), {...input, source_group:group, active:true, createdAt:serverTimestamp(), updatedAt:serverTimestamp()});
      created++;
    }
  }
  for (const offer of existing) {
    if (group && (offer.source_group || offerSourceGroup(offer.source_file || '')) === group && !matchedIds.has(offer.id)) {
      batch.update(doc(db, 'offers', offer.id), {active:false, retiredAt:serverTimestamp(), updatedAt:serverTimestamp()});
      retired++;
    }
  }
  if (created + updated + retired > 450) throw new Error('This rate sheet has too many rows for one safe import. Split it into smaller files.');
  if (inputs.length) await batch.commit();
  return { created, updated, retired };
}
export function cleanOfferInput(raw: Partial<OfferInput>): OfferInput | null {
  const title = String(raw.title || "")
    .trim()
    .slice(0, 200);
  if (!title) return null;
  const services = (Array.isArray(raw.services) ? raw.services : []).filter(
    (x): x is Service =>
      [
        "internet",
        "byod",
        "phone",
        "multiline",
        "subscription",
        "giftcard",
      ].includes(String(x)),
  );
  const customer_segments = (
    Array.isArray(raw.customer_segments) ? raw.customer_segments : []
  ).filter((x): x is CustomerType =>
    ["consumer", "epp", "small_business", "student", "p2p"].includes(String(x)),
  );
  return {
    title,
    description: String(raw.description || "").trim().slice(0, 1200),
    brand: (["bell", "virgin", "both"].includes(String(raw.brand))
      ? raw.brand
      : "both") as Brand | "both",
    services,
    customer_segments,
    valid_until: String(raw.valid_until || ""),
    plan_code: String(raw.plan_code || "").trim().slice(0, 80),
    data_allowance: String(raw.data_allowance || "").trim().slice(0, 80),
    eligibility: String(raw.eligibility || "").trim().slice(0, 800),
    pricing: String(raw.pricing || "").trim().slice(0, 1000),
    source_file: String(raw.source_file || "").trim().slice(0, 200),
    source_page: Number(raw.source_page) || 0,
    source_date: String(raw.source_date || "").trim().slice(0, 20),
    offer_key: String(raw.offer_key || "").trim().slice(0, 200),
    source_group: String(raw.source_group || "").trim().slice(0, 200),
    active: raw.active !== false,
  };
}
