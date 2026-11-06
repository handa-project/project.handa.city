// HAnDA: メンバー（Cosense の #member/年度 付きページ）を集める。
// メンバーページ（templates/members.astro）とトップの MEMBERS 欄で使う。
// 書き方・並び順のルールは templates/members.astro の先頭を参照。
import { getCollection } from "astro:content";
import { MEMBER_TAG } from "./sections";
import { handaConfig } from "./config";

// ---- 表示する名前 ------------------------------------------------------------
// 同姓同名の人がいるときは、Cosense のページ名を「半田太郎（建築学科）」のように
// 区別して付ける。サイトでは名前の後ろの（ ）の部分を表示しない
export const displayName = (title: string) => title.replace(/\s*[（(][^（）()]*[）)]\s*$/, "").trim() || title;

/** 名前の後ろに（ ）が付いているメンバーページの { ページ名 → 表示する名前 }（本文中のリンクの文字を直すため） */
export async function memberDisplayNames(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const e of await getCollection("pages")) {
    if (!e.data.tags.some((t) => MEMBER_TAG.test(t))) continue;
    const name = displayName(e.data.title);
    if (name !== e.data.title) out.set(e.data.title, name);
  }
  return out;
}

// ---- 並び順の材料 ------------------------------------------------------------
export const memberCfg = handaConfig.members ?? {};
export const DEPT_ORDER = memberCfg.departments ?? [];
const ROLE_ORDER = memberCfg.roles ?? ["代表", "副代表"];
export const OTHER_DEPT = "その他";

const tagValue = (tags: string[], ...prefixes: string[]) => {
  for (const prefix of prefixes) {
    const t = tags.find((t) => t.toLowerCase().startsWith(`${prefix.toLowerCase()}/`));
    if (t) return t.slice(prefix.length + 1).trim() || undefined;
  }
  return undefined;
};

// 学年のタグ（#学年/B3 #学年/M1 など）を「B3」「M1」の形にそろえる。数字だけ（#学年/3）は学部として B3 にする
export function gradeLabel(raw?: string): string | undefined {
  if (!raw) return undefined;
  const t = raw.normalize("NFKC").trim().toUpperCase().replace(/\s+/g, "").replace(/年$/, "");
  const m = t.match(/^(B|M|D|学部|修士|博士)?(\d)$/);
  if (!m) return t || undefined;
  const kind = m[1] === "修士" ? "M" : m[1] === "博士" ? "D" : m[1] === "学部" ? "B" : m[1] ?? "B";
  return `${kind}${m[2]}`;
}

// 表示用の学年：B3 → ３年、M1 → 修士１年、D1 → 博士１年（タグは B3 などのまま）
const zen = (d: string) => String.fromCharCode(d.charCodeAt(0) + 0xfee0);
export function gradeText(label?: string): string | undefined {
  const m = label?.match(/^([BMD])(\d)$/);
  if (!m) return label;
  return `${{ B: "", M: "修士", D: "博士" }[m[1] as "B" | "M" | "D"]}${zen(m[2])}年`;
}

// 学年を数値に（大きいほど上の学年）。D > M > B > 不明
function gradeRank(label?: string): number {
  const m = label?.match(/^([BMD])(\d)$/);
  if (!m) return 0;
  return { B: 100, M: 200, D: 300 }[m[1] as "B" | "M" | "D"] + Number(m[2]);
}

/** メンバーかどうか（#member/2026 などが付いている） */
export const isMemberPage = (tags: string[]) => tags.some((t) => MEMBER_TAG.test(t));

/**
 * メンバーページのタグから、サイトに出す情報を読む。本文は読まない（本文に何を書いてもサイトには出ない）
 *   #学科/情報科学科（#dept/ も可）  #学年/B3（#grade/ も可）  #role/代表（#役職/ も可）
 */
export function memberInfo(tags: string[]) {
  const legacyLeader = tags.some((t) => ["member/leader", "role/leader"].includes(t.toLowerCase()));
  const role = tagValue(tags, "role", "役職") ?? (legacyLeader ? "代表" : undefined);
  const dept = tagValue(tags, "学科", "dept");
  const grade = gradeLabel(tagValue(tags, "学年", "grade"));
  return { role, dept, grade, line: [dept, gradeText(grade)].filter(Boolean).join(" ") || undefined };
}

// 1 人 1 件。その人の在籍年度・学科・学年・読み方・役職を持たせる
export async function loadMembers() {
  const pages = await getCollection("pages");
  return pages
  .map((entry) => {
    const tags = entry.data.tags;
    const years = [
      ...new Set(tags.map((t) => t.match(MEMBER_TAG)?.[1]).filter((y): y is string => Boolean(y))),
    ].sort();
    const info = memberInfo(tags);
    const roleIdx = info.role ? ROLE_ORDER.indexOf(info.role) : -1;
    return {
      entry,
      years,
      dept: info.dept ?? OTHER_DEPT,
      grade: gradeRank(info.grade),
      line: info.line,
      deptName: info.dept,
      gradeLabel: info.grade,
      yomi: (tagValue(tags, "yomi", "よみ") ?? entry.data.title).normalize("NFKC"),
      role: info.role,
      roleRank: info.role ? (roleIdx >= 0 ? ROLE_ORDER.length - roleIdx : 1) : 0,
    };
  })
  .filter((m) => m.years.length > 0)
  .sort(
    (a, b) =>
      b.roleRank - a.roleRank ||
      b.grade - a.grade ||
      a.yomi.localeCompare(b.yomi, "ja") ||
      a.entry.data.title.localeCompare(b.entry.data.title, "ja"),
  );
}

// 学科の並び順（handa.config.ts の departments、無い学科は後ろに）
export const deptRank = (d: string) => {
  if (d === OTHER_DEPT) return 10_000;
  const i = DEPT_ORDER.indexOf(d);
  return i >= 0 ? i : 1_000;
};
