import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import snapshot from "./snapshot.json";
import { CSV_URL, lastOfficialYear, type OfficialData, parseCsv } from "./source";

const CACHE_KEY = "official-holidays";
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

interface Cached extends OfficialData {
  fetchedAt: number;
}

const cache = new Cache();

function readCache(): Cached | undefined {
  try {
    const raw = cache.get(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cached) : undefined;
  } catch {
    return undefined;
  }
}

/** 取得したデータが同梱スナップショットより古ければ採用しない */
function isUsable(data: OfficialData, fallback: OfficialData): boolean {
  return Object.keys(data.entries).length >= 1000 && lastOfficialYear(data) >= lastOfficialYear(fallback);
}

async function fetchOfficial(): Promise<OfficialData> {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = new TextDecoder("shift_jis").decode(await res.arrayBuffer());
  return parseCsv(text);
}

/**
 * 内閣府の祝日データを返す。
 * 同梱スナップショット → キャッシュ → 週1回のバックグラウンド再取得 の順で新しいものを使う。
 */
export function useOfficialHolidays(): OfficialData {
  const [data, setData] = useState<OfficialData>(() => {
    const cached = readCache();
    return cached && isUsable(cached, snapshot) ? cached : snapshot;
  });

  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.fetchedAt < REFRESH_INTERVAL_MS) return;

    let cancelled = false;
    fetchOfficial()
      .then((fresh) => {
        if (cancelled || !isUsable(fresh, snapshot)) return;
        cache.set(CACHE_KEY, JSON.stringify({ ...fresh, fetchedAt: Date.now() }));
        setData(fresh);
      })
      .catch(() => {
        // オフライン等。手元のデータ（キャッシュ or スナップショット）で表示を続ける
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
