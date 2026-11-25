// Cloudflare Pages Function：GET /api/google-reviews
// 環境變數（Pages > Settings > Variables and Secrets）：
//   GOOGLE_API_KEY  — Google Cloud 的 API Key（啟用 Places API (New)，限制只能呼叫此 API）
//   GOOGLE_PLACE_ID — 旭騰車行的 Place ID
export async function onRequestGet({ env, request, waitUntil }) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=1800' };
  if (!env.GOOGLE_API_KEY || !env.GOOGLE_PLACE_ID) {
    return new Response(JSON.stringify({ error: 'not configured' }), { status: 503, headers });
  }

  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const url = 'https://places.googleapis.com/v1/places/' + env.GOOGLE_PLACE_ID + '?languageCode=zh-TW';
  const r = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': env.GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews'
    }
  });
  if (!r.ok) return new Response(JSON.stringify({ error: 'upstream ' + r.status }), { status: 502, headers });

  const d = await r.json();
  const body = JSON.stringify({
    rating: d.rating || null,
    total: d.userRatingCount || null,
    reviews: (d.reviews || []).map(v => ({
      author: v.authorAttribution && v.authorAttribution.displayName,
      rating: v.rating,
      text: v.text && v.text.text
    }))
  });
  const res = new Response(body, { headers });
  waitUntil(cache.put(request, res.clone()));
  return res;
}
