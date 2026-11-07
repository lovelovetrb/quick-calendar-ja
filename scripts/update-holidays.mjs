// 内閣府の祝日CSVを取得し、同梱用スナップショット src/holidays/snapshot.json を生成する。
// 使い方: npm run update-holidays
import { writeFile } from "node:fs/promises";

const URL = "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv";
const OUT = new globalThis.URL("../src/holidays/snapshot.json", import.meta.url);

const res = await fetch(URL);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const text = new TextDecoder("shift_jis").decode(await res.arrayBuffer());

const entries = {};
for (const line of text.split(/\r?\n/).slice(1)) {
  const m = line.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2}),(.+)$/);
  if (!m) continue;
  const key = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  entries[key] = m[4].trim();
}
const count = Object.keys(entries).length;
if (count < 1000) throw new Error(`祝日の件数が少なすぎます: ${count}`);

await writeFile(OUT, `${JSON.stringify({ source: URL, entries }, null, 0)}\n`);
console.log(`wrote ${count} holidays to ${OUT.pathname}`);
