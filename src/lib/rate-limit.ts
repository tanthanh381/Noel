type Bucket = { count: number; resetAt: number };

const loginBuckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function checkLoginRateLimit(key: string, now = Date.now()) {
  const current = loginBuckets.get(key);
  if (!current || current.resetAt <= now) {
    loginBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearLoginRateLimit(key: string) {
  loginBuckets.delete(key);
}

export function resetLoginRateLimitsForTests() {
  loginBuckets.clear();
}
