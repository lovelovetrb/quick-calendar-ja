// 祝日法（現行法）のルールから祝日を計算する。
// 内閣府CSVに載っていない将来の年の「予測」に使う。
// 特別法による一時的な移動（例: 2020/2021年の五輪特例）は計算では再現できない。

export type HolidayMap = Map<string, string>;

export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** month は 1-12、n 番目の weekday（0=日）の日付 */
function nthWeekday(year: number, month: number, n: number, weekday: number): number {
  const first = new Date(year, month - 1, 1).getDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
}

// 春分・秋分の近似式（1980〜2099年、2100〜2150年で係数が変わる）
function equinoxDay(year: number, base1980_2099: number, base2100_2150: number): number {
  const base = year <= 2099 ? base1980_2099 : base2100_2150;
  return Math.floor(base + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

export function computeHolidays(year: number): HolidayMap {
  const fixed: [number, number, string][] = [
    [1, 1, "元日"],
    [1, nthWeekday(year, 1, 2, 1), "成人の日"],
    [2, 11, "建国記念の日"],
    [2, 23, "天皇誕生日"],
    [3, equinoxDay(year, 20.8431, 21.851), "春分の日"],
    [4, 29, "昭和の日"],
    [5, 3, "憲法記念日"],
    [5, 4, "みどりの日"],
    [5, 5, "こどもの日"],
    [7, nthWeekday(year, 7, 3, 1), "海の日"],
    [8, 11, "山の日"],
    [9, nthWeekday(year, 9, 3, 1), "敬老の日"],
    [9, equinoxDay(year, 23.2488, 24.2488), "秋分の日"],
    [10, nthWeekday(year, 10, 2, 1), "スポーツの日"],
    [11, 3, "文化の日"],
    [11, 23, "勤労感謝の日"],
  ];

  const holidays: HolidayMap = new Map();
  for (const [m, d, name] of fixed) holidays.set(dateKey(year, m, d), name);

  // 国民の休日: 前日と翌日が祝日である平日（祝日でない日）
  for (let t = new Date(year, 0, 2); t.getFullYear() === year; t.setDate(t.getDate() + 1)) {
    const key = dateKey(year, t.getMonth() + 1, t.getDate());
    if (holidays.has(key) || t.getDay() === 0) continue;
    const prev = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
    const next = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
    if (
      holidays.has(dateKey(prev.getFullYear(), prev.getMonth() + 1, prev.getDate())) &&
      holidays.has(dateKey(next.getFullYear(), next.getMonth() + 1, next.getDate()))
    ) {
      holidays.set(key, "国民の休日");
    }
  }

  // 振替休日: 祝日が日曜なら、その後の最初の「祝日でない日」が休日
  for (const [key] of [...holidays]) {
    const [y, m, d] = key.split("-").map(Number);
    if (new Date(y, m - 1, d).getDay() !== 0) continue;
    const t = new Date(y, m - 1, d + 1);
    while (holidays.has(dateKey(t.getFullYear(), t.getMonth() + 1, t.getDate()))) t.setDate(t.getDate() + 1);
    holidays.set(dateKey(t.getFullYear(), t.getMonth() + 1, t.getDate()), "振替休日");
  }

  return holidays;
}
