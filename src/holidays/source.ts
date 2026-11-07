import { computeHolidays, dateKey } from "./compute";

export const CSV_URL = "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv";

/** 内閣府CSV由来のデータ（キーは YYYY-MM-DD） */
export interface OfficialData {
  entries: Record<string, string>;
}

export interface Holiday {
  day: number;
  name: string;
}

export interface MonthHolidays {
  holidays: Holiday[];
  /** true のとき内閣府未発表の年で、計算による予測 */
  predicted: boolean;
}

export function parseCsv(text: string): OfficialData {
  const entries: Record<string, string> = {};
  for (const line of text.split(/\r?\n/).slice(1)) {
    const m = line.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2}),(.+)$/);
    if (!m) continue;
    entries[dateKey(Number(m[1]), Number(m[2]), Number(m[3]))] = m[4].trim();
  }
  return { entries };
}

export function lastOfficialYear(data: OfficialData): number {
  let max = 0;
  for (const key of Object.keys(data.entries)) max = Math.max(max, Number(key.slice(0, 4)));
  return max;
}

/**
 * CSVでは振替休日・国民の休日がどちらも「休日」なので呼び分ける。
 * 連続する休みを遡って、日曜の祝日に行き着けば振替休日。
 */
function labelKyujitsu(entries: Record<string, string>, y: number, m: number, d: number): string {
  const t = new Date(y, m - 1, d - 1);
  while (entries[dateKey(t.getFullYear(), t.getMonth() + 1, t.getDate())]) {
    if (t.getDay() === 0) return "振替休日";
    t.setDate(t.getDate() - 1);
  }
  return "国民の休日";
}

/** month は 0-11 */
export function holidaysForMonth(data: OfficialData, year: number, month: number): MonthHolidays {
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  if (year <= lastOfficialYear(data)) {
    const holidays: Holiday[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const name = data.entries[dateKey(year, month + 1, d)];
      if (!name) continue;
      holidays.push({ day: d, name: name === "休日" ? labelKyujitsu(data.entries, year, month + 1, d) : name });
    }
    return { holidays, predicted: false };
  }

  const computed = computeHolidays(year);
  const holidays: Holiday[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const name = computed.get(dateKey(year, month + 1, d));
    if (name) holidays.push({ day: d, name });
  }
  return { holidays, predicted: true };
}
