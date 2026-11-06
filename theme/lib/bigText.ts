// HAnDA: Cosense で文字を大きくしたところ（[** ] [*** ] …）を、サイトで赤くするための印を付ける。
//   - [* ]（太字・大きさはそのまま）は赤くしない。1 段大きくした [** ] から赤
//   - 行全体を [** ] 以上で囲んだ行は見出し（h2〜h4）になり、見出しは CSS で赤（handa.css）
//   - 文の途中の [** ] は、cosense-site-kit が大きさの情報を捨てて <strong> だけにするので、
//     ここで Cosense の元の文字（.cosense-cache）を読み直して大きさを調べ、そのページの <strong> に印を付ける
// 印：strong の先頭に見えない文字（BIG_MARK）を入れておき、components/Pinned.astro で
//   <strong class="big-text"> に書き換える（印の文字は消える）
// src/content.config.ts から、ページを読み込むときに使う。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@progfay/scrapbox-parser";

export const BIG_MARK = "⁣";

type SNode = { type: string; raw?: string; decos?: string[]; nodes?: SNode[]; text?: string };
type Inline = { type: string; value?: string; children?: Inline[] };
type Block = { type: string; children?: Inline[]; rows?: Inline[][][] };

// 文字の大きさ（[* ] = 1、[** ] = 2 …）。[[ ]] の太字は 1
const levelOf = (n: SNode): number | null => {
  if (n.type === "strong") return 1;
  if (n.type !== "decoration") return null;
  const lv = (n.decos ?? []).filter((d) => d.startsWith("*-")).map((d) => Number(d.slice(2)));
  return lv.length ? Math.max(...lv) : null;
};
const plainOf = (nodes?: SNode[]): string =>
  (nodes ?? []).map((n) => (n.type === "plain" || n.type === "blank" ? n.text ?? "" : n.nodes ? plainOf(n.nodes) : "")).join("");

// Cosense の文から、<strong> になるところを出てくる順に集める（kit の変換と同じ順番：外側が先）
function collect(nodes: SNode[] | undefined, out: { level: number; text: string }[]) {
  for (const n of nodes ?? []) {
    const lv = levelOf(n);
    if (lv !== null) out.push({ level: lv, text: plainOf(n.nodes).trim() });
    if (n.type === "quote" || n.type === "numberList" || n.type === "decoration" || n.type === "strong") collect(n.nodes, out);
  }
}

function sourceStrongs(text: string) {
  const out: { level: number; text: string }[] = [];
  for (const b of parse(text, { hasTitle: true }) as unknown as { type: string; indent?: number; nodes?: SNode[]; cells?: SNode[][][] }[]) {
    if (b.type === "line") {
      const nodes = b.nodes ?? [];
      const only = nodes.length === 1 ? nodes[0] : undefined;
      // 行全体を [** ] 以上で囲んだ行は見出しになる（その飾り自体は <strong> にならない）
      if (b.indent === 0 && only && only.type === "decoration" && (levelOf(only) ?? 0) >= 2) collect(only.nodes, out);
      else collect(nodes, out);
    } else if (b.type === "table") {
      for (const row of b.cells ?? []) {
        for (const cell of row) {
          const raw = cell.map((n) => n.raw ?? "").join("");
          const line = (parse(raw, { hasTitle: false }) as unknown as { type: string; nodes?: SNode[] }[]).find((x) => x.type === "line");
          collect(line?.nodes ?? cell, out);
        }
      }
    }
  }
  return out;
}

const textOf = (nodes?: Inline[]): string =>
  (nodes ?? []).map((n) => (n.type === "text" || n.type === "code" ? n.value ?? "" : textOf(n.children))).join("");

// サイト側の <strong> を出てくる順に
function siteStrongs(blocks: Block[]) {
  const out: Inline[] = [];
  const walk = (nodes?: Inline[]) => {
    for (const n of nodes ?? []) {
      if (n.type === "strong") out.push(n);
      walk(n.children);
    }
  };
  for (const b of blocks) {
    if (b.rows) b.rows.forEach((r) => r.forEach((c) => walk(c)));
    else walk(b.children);
  }
  return out;
}

const mark = (n: Inline) => {
  n.children = [{ type: "text", value: BIG_MARK }, ...(n.children ?? [])];
};

/** ページのデータ（cosense-site-kit の形）の、大きい文字の <strong> に印を付ける。読めないときは何もしない */
export function markBigText<T extends { id?: string; blocks?: unknown[] }>(page: T, cacheDir = ".cosense-cache"): T {
  try {
    const id = page.id;
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || !page.blocks) return page;
    const raw = JSON.parse(readFileSync(join(process.cwd(), cacheDir, "pages", id.slice(0, 2), `${id}.json`), "utf8"));
    const src = sourceStrongs(String(raw.text ?? ""));
    if (!src.some((s) => s.level >= 2)) return page;
    const site = siteStrongs(page.blocks as Block[]);
    if (site.length === src.length) {
      // 数がそろっていれば、順番どおりに対応させる
      site.forEach((n, i) => src[i].level >= 2 && mark(n));
    } else {
      // そろわないときは文字で対応させる（同じページで太字にも使っている文字は印を付けない）
      const big = new Set(src.filter((s) => s.level >= 2).map((s) => s.text));
      const normal = new Set(src.filter((s) => s.level < 2).map((s) => s.text));
      for (const n of site) {
        const t = textOf(n.children).trim();
        if (big.has(t) && !normal.has(t)) mark(n);
      }
    }
  } catch {
    // キャッシュが無いなどのときは、印を付けない（太字のまま）
  }
  return page;
}
