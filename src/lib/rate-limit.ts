type Bucket = {
  times: number[];
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { times: [] };
  bucket.times = bucket.times.filter((time) => now - time < windowMs);

  if (bucket.times.length >= limit) {
    buckets.set(key, bucket);
    return false;
  }

  bucket.times.push(now);
  buckets.set(key, bucket);

  if (buckets.size > 5000) {
    for (const [bucketKey, value] of buckets) {
      if (!value.times.some((time) => now - time < windowMs)) {
        buckets.delete(bucketKey);
      }
    }
  }

  return true;
}
