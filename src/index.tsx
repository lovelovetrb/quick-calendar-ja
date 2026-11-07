import {
  Action,
  ActionPanel,
  Color,
  Detail,
  environment,
  getPreferenceValues,
  type Keyboard,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { holidaysForMonth } from "./holidays/source";
import { useOfficialHolidays } from "./holidays/useHolidays";
import { renderCalendarSvg, svgToDataUri } from "./svg";

interface Preferences {
  weekStart: "0" | "1";
  showWeeks: boolean;
  showHolidayNames: boolean;
}

type Shortcut = { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent };

/**
 * 月・年の移動。矢印キーがメインで、Vim / Emacs 風のキーでも同じ操作ができる。
 * Vim: h/l で月、k/j で年（上=前、下=次）
 * Emacs: C-b/C-f で月、C-p/C-n で年
 */
const NAV_ACTIONS: {
  title: string;
  months: number;
  icon: { dark: string; light: string };
  arrow: Shortcut;
  vim: Shortcut;
  emacs: Shortcut;
}[] = [
  {
    title: "前の月",
    months: -1,
    icon: { dark: "left-dark.png", light: "left.png" },
    arrow: { modifiers: [], key: "arrowLeft" },
    vim: { modifiers: [], key: "h" },
    emacs: { modifiers: ["ctrl"], key: "b" },
  },
  {
    title: "次の月",
    months: 1,
    icon: { dark: "right-dark.png", light: "right.png" },
    arrow: { modifiers: [], key: "arrowRight" },
    vim: { modifiers: [], key: "l" },
    emacs: { modifiers: ["ctrl"], key: "f" },
  },
  {
    title: "前の年",
    months: -12,
    icon: { dark: "double-left-dark.png", light: "double-left.png" },
    arrow: { modifiers: ["shift"], key: "arrowLeft" },
    vim: { modifiers: [], key: "k" },
    emacs: { modifiers: ["ctrl"], key: "p" },
  },
  {
    title: "次の年",
    months: 12,
    icon: { dark: "double-right-dark.png", light: "double-right.png" },
    arrow: { modifiers: ["shift"], key: "arrowRight" },
    vim: { modifiers: [], key: "j" },
    emacs: { modifiers: ["ctrl"], key: "n" },
  },
];

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 和暦（その月の1日時点） */
function eraLabel(year: number, month: number): string {
  const ym = year * 100 + month + 1;
  const format = (name: string, y: number) => `${name}${y === 1 ? "元" : y}年`;
  if (ym >= 201905) return format("令和", year - 2018);
  if (ym >= 198902) return format("平成", year - 1988);
  if (ym >= 192601) return format("昭和", year - 1925);
  return "";
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const weekStart = prefs.weekStart === "1" ? 1 : 0;
  const official = useOfficialHolidays();
  const [date, setDate] = useState(() => firstOfMonth(new Date()));

  const year = date.getFullYear();
  const month = date.getMonth();
  const header = `${year}年${month + 1}月`;

  const markdown = useMemo(() => {
    const era = eraLabel(year, month);
    const monthHolidays = holidaysForMonth(official, year, month);
    const svg = renderCalendarSvg({
      year,
      month,
      title: `${year}年${era ? `(${era}) ` : ""}${month + 1}月`,
      note: monthHolidays.predicted ? "※ 祝日は内閣府未発表のため計算による予測" : undefined,
      weekStart,
      showWeeks: prefs.showWeeks,
      showHolidayNames: prefs.showHolidayNames,
      holidays: new Map(monthHolidays.holidays.map((h) => [h.day, h.name])),
      today: new Date(),
      appearance: environment.appearance,
    });
    return `![](${svgToDataUri(svg)})`;
  }, [official, year, month, weekStart, prefs.showWeeks, prefs.showHolidayNames]);

  const shift = (months: number) => setDate(new Date(year, month + months, 1));

  const goToCurrent = () => {
    const current = firstOfMonth(new Date());
    if (current.getTime() === date.getTime()) {
      showToast(Toast.Style.Success, "今月を表示しています");
    } else {
      setDate(current);
    }
  };

  return (
    <Detail
      navigationTitle={header}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={header}>
            <Action
              title="今月"
              shortcut={{ modifiers: [], key: "c" }}
              icon={{ source: { dark: "up-dark.png", light: "up.png" }, tintColor: Color.PrimaryText }}
              onAction={goToCurrent}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="移動">
            {NAV_ACTIONS.map((a) => (
              <Action
                key={a.title}
                title={a.title}
                shortcut={{ modifiers: a.arrow.modifiers, key: a.arrow.key }}
                icon={{ source: a.icon, tintColor: Color.PrimaryText }}
                onAction={() => shift(a.months)}
              />
            ))}
          </ActionPanel.Section>
          {(["vim", "emacs"] as const).map((style) => (
            <ActionPanel.Section key={style} title={style === "vim" ? "移動（Vim）" : "移動（Emacs）"}>
              {NAV_ACTIONS.map((a) => (
                <Action
                  key={a.title}
                  title={a.title}
                  shortcut={{ modifiers: a[style].modifiers, key: a[style].key }}
                  icon={{ source: a.icon, tintColor: Color.PrimaryText }}
                  onAction={() => shift(a.months)}
                />
              ))}
            </ActionPanel.Section>
          ))}
          <ActionPanel.Section>
            <Action
              title="拡張機能の設定を開く"
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
