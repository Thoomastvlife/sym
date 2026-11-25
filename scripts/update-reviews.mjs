// 由 GitHub Actions 定時執行：向 Google Places API (New) 取得評分與評論，寫入 reviews-data.json
import { readFile, writeFile } from 'node:fs/promises';

const key = process.env.GOOGLE_API_KEY;
const placeId = process.env.GOOGLE_PLACE_ID;
if (!key || !placeId) { console.error('缺少 GOOGLE_API_KEY 或 GOOGLE_PLACE_ID'); process.exit(1); }

const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=zh-TW`, {
  headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating,userRatingCount,reviews' }
});
if (!res.ok) { console.error('Google API 錯誤', res.status, await res.text()); process.exit(1); }
const d = await res.json();

const file = 'reviews-data.json';
const old = JSON.parse(await readFile(file, 'utf8'));

const fresh = (d.reviews || [])
  .map(v => ({
    author: v.authorAttribution?.displayName || 'Google 使用者',
    rating: v.rating || 5,
    text: (v.text?.text || v.originalText?.text || '').trim()
  }))
  .filter(v => v.text);

const next = {
  rating: d.rating ?? old.rating,
  total: d.userRatingCount ?? old.total,
  reviews: fresh.length ? fresh : old.reviews   // 抓不到評論文字時沿用舊的
};

const out = JSON.stringify(next, null, 2) + '\n';
if (out === JSON.stringify(old, null, 2) + '\n') { console.log('沒有變動'); } else {
  await writeFile(file, out);
  console.log('已更新', next.rating, next.total, next.reviews.length + ' 則評論');
}
