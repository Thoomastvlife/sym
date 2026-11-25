// 由 GitHub Actions 每天執行一次：透過 SerpApi 的 Google Maps Reviews 取得評分與評論，寫入 reviews-data.json
// 正常情況每次只呼叫 1 次 API（每月約 30 次）
import { readFile, writeFile } from 'node:fs/promises';

const key = process.env.SERPAPI_KEY;
// 店家 place_id（SYM-三陽機車-旭騰機車行）；也可用 GitHub Secret GOOGLE_PLACE_ID 覆蓋
const placeId = process.env.GOOGLE_PLACE_ID || 'ChIJG37TH8qpQjQRxBTwORp3kYQ';
let dataId = process.env.GOOGLE_DATA_ID || '';
if (!key) { console.error('缺少 SERPAPI_KEY（請到 GitHub Secrets 設定）'); process.exit(1); }

async function serp(params) {
  const q = new URLSearchParams({ hl: 'zh-TW', api_key: key, ...params });
  const res = await fetch(`https://serpapi.com/search.json?${q}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`SerpApi ${res.status}: ${body.error || 'unknown error'}`);
  return body;
}

const reviewParams = (id) => ({
  engine: 'google_maps_reviews',
  sort_by: 'newestFirst',
  ...(id.dataId ? { data_id: id.dataId } : { place_id: id.placeId })
});

let d;
try {
  d = await serp(reviewParams({ dataId, placeId }));
} catch (e) {
  // 後備方案：用 place_id 查出 data_id 後再抓一次（會多用 1 次額度）
  console.warn('第一次呼叫失敗，嘗試查詢 data_id：', e.message);
  try {
    const m = await serp({ engine: 'google_maps', place_id: placeId });
    dataId = m.place_results?.data_id;
    if (!dataId) throw new Error('查不到 data_id');
    console.log('取得 data_id：', dataId, '（可存成 GOOGLE_DATA_ID Secret 以省額度）');
    d = await serp(reviewParams({ dataId }));
  } catch (e2) {
    console.error('仍然失敗：', e2.message);
    process.exit(1);
  }
}

const file = 'reviews-data.json';
const old = JSON.parse(await readFile(file, 'utf8'));

const fresh = (d.reviews || [])
  .map(v => ({
    author: v.user?.name || 'Google 使用者',
    rating: v.rating || 5,
    text: (v.extracted_snippet?.original || v.snippet || '').trim()
  }))
  .filter(v => v.text)
  .slice(0, 10); // 只保留最新 10 則

const next = {
  rating: d.place_info?.rating ?? old.rating,
  total: d.place_info?.reviews ?? old.total,
  reviews: fresh.length ? fresh : old.reviews // 抓不到評論文字時沿用舊的
};

const out = JSON.stringify(next, null, 2) + '\n';
if (out === JSON.stringify(old, null, 2) + '\n') { console.log('沒有變動'); } else {
  await writeFile(file, out);
  console.log('已更新', next.rating, next.total, next.reviews.length + ' 則評論');
}