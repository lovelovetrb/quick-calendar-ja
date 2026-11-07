import { weekNumber, weekNumberSun } from "weeknumber";

export type Appearance = "light" | "dark";

export interface CalendarSvgOptions {
  year: number;
  /** 0-11 */
  month: number;
  title: string;
  /** タイトル行の右側に小さく出す注記 */
  note?: string;
  /** 0 = 日曜始まり, 1 = 月曜始まり */
  weekStart: 0 | 1;
  showWeeks: boolean;
  showHolidayNames: boolean;
  /** 日付 → 祝日名（休日含む） */
  holidays: Map<number, string>;
  today: Date;
  appearance: Appearance;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const PALETTE = {
  light: {
    text: "#1f2328",
    muted: "#8c959f",
    line: "#d0d7de",
    sunday: "#d1242f",
    saturday: "#0969da",
    onAccent: "#ffffff",
  },
  dark: {
    text: "#e6edf3",
    muted: "#7d8590",
    line: "#30363d",
    sunday: "#ff7b72",
    saturday: "#79c0ff",
    onAccent: "#0d1117",
  },
} as const;

// Raycast のウィンドウ（約750×475、検索バーとアクションバーを除く）にスクロールなしで収まるサイズ
const WIDTH = 700;
const TITLE_H = 40;
const WEEKDAY_H = 28;
// 日付部分の高さは固定し、その月の週の数（4〜6）で割って1行の高さを決める
const GRID_H = 276;
const WEEK_COL_W = 42;
const HOLIDAY_FONT_MAX = 12;
const FONT = "-apple-system, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";

/** month の日付を週ごとに並べた配列（前後月の部分は null） */
export function monthMatrix(year: number, month: number, weekStart: 0 | 1): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  const weeks: (Date | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const week: (Date | null)[] = [];
    for (let c = 0; c < 7; c++) {
      const d = r * 7 + c - offset + 1;
      week.push(d >= 1 && d <= daysInMonth ? new Date(year, month, d) : null);
    }
    weeks.push(week);
  }
  return weeks;
}

export function renderCalendarSvg(opts: CalendarSvgOptions): string {
  const { year, month, title, note, weekStart, showWeeks, showHolidayNames, holidays, today, appearance } = opts;
  const p = PALETTE[appearance];
  const left = showWeeks ? WEEK_COL_W : 0;
  const cellW = (WIDTH - left) / 7;
  const gridTop = TITLE_H + WEEKDAY_H;
  const height = gridTop + GRID_H;

  const colorFor = (weekday: number, isHoliday: boolean) => {
    if (isHoliday || weekday === 0) return p.sunday;
    if (weekday === 6) return p.saturday;
    return p.text;
  };

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" font-family="${FONT}">`,
  );

  // タイトル
  parts.push(text(4, TITLE_H / 2, title, p.text, 22, 700, "start"));
  if (note) parts.push(text(WIDTH - 4, TITLE_H / 2, note, p.muted, 11, 400, "end"));

  // 曜日ヘッダー
  const headerY = TITLE_H + WEEKDAY_H / 2;
  if (showWeeks) parts.push(text(WEEK_COL_W / 2, headerY, "週", p.muted, 12, 600));
  for (let c = 0; c < 7; c++) {
    const weekday = (c + weekStart) % 7;
    parts.push(text(left + cellW * c + cellW / 2, headerY, WEEKDAY_LABELS[weekday], colorFor(weekday, false), 14, 600));
  }
  parts.push(`<line x1="0" y1="${gridTop - 0.5}" x2="${WIDTH}" y2="${gridTop - 0.5}" stroke="${p.line}" />`);

  // 日付（サイズは行の高さに合わせる）
  const weeks = monthMatrix(year, month, weekStart);
  const rowH = GRID_H / weeks.length;
  const numberSize = Math.min(22, rowH * 0.42);
  const circleR = Math.min(19, rowH * 0.36);
  const numberDy = showHolidayNames ? -rowH * 0.17 : 0;
  const nameDy = rowH * 0.33;
  weeks.forEach((week, r) => {
    const cy = gridTop + rowH * r + rowH / 2;
    const anyDay = week.find((d): d is Date => d !== null);
    if (showWeeks && anyDay) {
      const wn = weekStart === 0 ? weekNumberSun(anyDay) : weekNumber(anyDay);
      parts.push(text(WEEK_COL_W / 2, cy + numberDy, String(wn), p.muted, 14, 400));
    }
    week.forEach((day, c) => {
      if (!day) return;
      const cx = left + cellW * c + cellW / 2;
      const holidayName = holidays.get(day.getDate());
      const color = colorFor(day.getDay(), holidayName !== undefined);
      const ny = cy + numberDy;
      if (day.toDateString() === today.toDateString()) {
        parts.push(`<circle cx="${cx}" cy="${ny}" r="${circleR.toFixed(1)}" fill="${color}" />`);
        parts.push(text(cx, ny, String(day.getDate()), p.onAccent, numberSize, 700));
      } else {
        parts.push(text(cx, ny, String(day.getDate()), color, numberSize, 500));
      }
      if (showHolidayNames && holidayName) {
        // 長い名前（例: 体育の日（スポーツの日））はセル幅に収まるよう縮める
        const size = Math.min(HOLIDAY_FONT_MAX, (cellW - 6) / holidayName.length);
        parts.push(text(cx, cy + nameDy, holidayName, color, size, 500));
      }
    });
  });

  parts.push("</svg>");
  return parts.join("");
}

function text(
  x: number,
  y: number,
  content: string,
  fill: string,
  size: number,
  weight: number,
  anchor: "start" | "middle" | "end" = "middle",
): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size.toFixed(1)}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="central">${escapeXml(content)}</text>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
