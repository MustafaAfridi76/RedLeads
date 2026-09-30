import { auth } from './firebase';
import type { OfferInput } from './domain';

export type ImportDraft = {
  fingerprint: string;
  fileName: string;
  pageCount: number;
  nextPage: number;
  context: string;
  sourceDate: string;
  offers: OfferInput[];
  excluded: number;
};

const draftKey = () => `redleads-pdf-draft:${auth.currentUser?.uid || 'signed-out'}`;

export function readImportDraft(): ImportDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey()) || 'null');
    return value?.offers && Array.isArray(value.offers) ? value : null;
  } catch {
    return null;
  }
}

export function saveImportDraft(draft: ImportDraft | null) {
  if (draft) localStorage.setItem(draftKey(), JSON.stringify(draft));
  else localStorage.removeItem(draftKey());
}
