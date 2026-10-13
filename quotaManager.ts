/**
 * Quota and Local Fallback Manager for Firestore
 * Gracefully handles free-tier quota exhaustion (20,000 daily writes)
 * and keeps the application fully functional in local-cache mode.
 */

const QUOTA_STORAGE_KEY = 'SAMS_FIRESTORE_QUOTA_EXHAUSTED_UNTIL';
// Daily free-tier write quotas in Google Cloud Firestore reset every 24 hours
const DEFAULT_EXHAUSTION_DURATION = 24 * 60 * 60 * 1000;

export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  const str = String(error);
  return (
    code === 'resource-exhausted' ||
    message.includes('resource-exhausted') ||
    message.includes('Quota limit exceeded') ||
    message.includes('Quota exceeded') ||
    message.includes('quota') ||
    str.includes('resource-exhausted') ||
    str.includes('Quota limit exceeded')
  );
}

export function markQuotaExhausted(durationMs: number = DEFAULT_EXHAUSTION_DURATION): void {
  try {
    const until = Date.now() + durationMs;
    localStorage.setItem(QUOTA_STORAGE_KEY, until.toString());
  } catch (e) {
    console.warn('Failed to store quota exhaustion flag:', e);
  }
}

export function isFirestoreQuotaExhausted(): boolean {
  try {
    const val = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!val) {
      return false;
    }
    const until = parseInt(val, 10);
    if (Date.now() < until) return true;
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    return false;
  } catch {
    return false;
  }
}

export function clearQuotaExhausted(): void {
  try {
    localStorage.removeItem(QUOTA_STORAGE_KEY);
  } catch {
    // ignore
  }
}
