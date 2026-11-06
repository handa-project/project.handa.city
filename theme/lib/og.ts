// HAnDA: SNS で共有したときに出る画像（OGP 画像）を、ページごとにビルド時に作る。
// URL を X・LINE・Slack などに貼ると、リンクの下に大きなカードで表示される。
//   - レンガの壁と白いパネル（サイトと同じデザイン）に、ロゴ・区分（BLOG など）・ページ名・説明文
//   - 作る対象：トップ・各一覧ページ・Cosense から取り込んだ全ページ
//   - 写真のあるページは、これまでどおりその写真を使う（Layout.astro）
// 画像は src/pages/og/[...path].png.ts が /og/〇〇.png として書き出す。
// 文字は Google Fonts から、その画像に使う文字だけを取り寄せて描く（ビルドにネット接続が必要）。
import { getCollection } from "astro:content";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasTag, path as sitePath } from "@cosense-site-kit/theme-utils";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { handaConfig } from "./config";
import { MEMBER_TAG, postsTag, sectionInfo, worksTag } from "./sections";
import { loadAboutMore } from "./about";
import { displayName, memberInfo } from "./members";

export interface OgEntry {
  /** ページの URL（/works/ など） */
  url: string;
  /** 画像のファイル名（拡張子なし）。/og/{key}.png */
  key: string;
  eyebrow?: string;
  title: string;
  description?: string;
}

const norm = (u: string) => (u.endsWith("/") ? u : `${u}/`);
const keyOf = (u: string) => decodeURI(norm(u)).replace(/^\/|\/$/g, "") || "index";

let cached: Promise<OgEntry[]> | undefined;

/** OGP 画像を作るページの一覧 */
export function ogEntries(): Promise<OgEntry[]> {
  cached ??= (async () => {
    const out: OgEntry[] = [];
    const add = (url: string, e: Omit<OgEntry, "url" | "key">) => out.push({ url: norm(url), key: keyOf(url), ...e });

    add(sitePath(""), { eyebrow: "", title: handaConfig.site.title, description: handaConfig.site.description });
    const blog = await sectionInfo("blog");
    const works = await sectionInfo("works");
    const members = await sectionInfo("members");
    for (const s of [blog, works, members]) add(s.href, { eyebrow: s.en, title: s.ja, description: s.intro });
    add(sitePath("contact"), { eyebrow: "Contact", title: "お問い合わせ" });

    const pTag = await postsTag();
    const wTag = await worksTag();
    const aboutTitles = new Set([handaConfig.home?.about, ...(await loadAboutMore()).map((e) => e.data.title)].filter(Boolean));
    for (const e of await getCollection("pages")) {
      const tags = e.data.tags;
      const eyebrow = tags.some((t) => MEMBER_TAG.test(t))
        ? members.en
        : pTag && hasTag(tags, pTag)
          ? blog.en
          : hasTag(tags, wTag)
            ? works.en
            : aboutTitles.has(e.data.title)
              ? "About"
              : "";
      const isMember = tags.some((t) => MEMBER_TAG.test(t));
      add(sitePath(e.data.slug), { eyebrow, title: isMember ? displayName(e.data.title) : e.data.title, description: isMember ? memberInfo(tags).line : e.data.summary });
    }
    // 同じ URL が重なったら最初のものだけ
    const seen = new Set<string>();
    return out.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)));
  })();
  return cached;
}

/** そのページの OGP 画像の URL（作っていないページなら undefined） */
export async function ogImageFor(pathname: string): Promise<string | undefined> {
  const key = keyOf(pathname);
  const hit = (await ogEntries()).some((e) => e.key === key);
  return hit ? sitePath(`og/${key}.png`) : undefined;
}

// ---- 描画 --------------------------------------------------------------------

const W = 1200;
const H = 630;
const RED = "#d6152e";
const BRICK = "#ecc3c7";
const JOINT = "#fbf3f4";

// $$赤文字$$ の記号など、画像には要らないものを取る
const clean = (s?: string) => (s ?? "").replaceAll("$$", "").replace(/\s+/g, " ").trim();
const cut = (s: string, n: number) => (Array.from(s).length > n ? `${Array.from(s).slice(0, n - 1).join("")}…` : s);

// Google Fonts から、使う文字だけを含むフォントを取り寄せる
const fontCache = new Map<string, Promise<ArrayBuffer>>();
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const chars = [...new Set(Array.from(text))].join("");
  const id = `${family}:${weight}:${chars}`;
  let p = fontCache.get(id);
  if (!p) {
    p = (async () => {
      const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(chars)}`;
      // User-Agent を付けないと、satori が読める TrueType 形式で返ってくる
      const css = await (await fetch(cssUrl)).text();
      const url = css.match(/src: url\((.+?)\)/)?.[1];
      if (!url) throw new Error(`フォントが見つかりません: ${family}`);
      return (await fetch(url)).arrayBuffer();
    })();
    fontCache.set(id, p);
  }
  return p;
}

// satori に渡す要素（JSX の代わり）
type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

// 左右のレンガの壁（イギリス積み）
function brickColumn(x: number, width: number): Node {
  const bh = 34, gap = 8, rows: Node[] = [];
  for (let r = 0, y = 0; y < H; r++, y += bh + gap) {
    const long = r % 2 === 0;
    const bw = long ? 130 : 61;
    const bricks: Node[] = [];
    for (let bx = long ? -40 : -70; bx < width; bx += bw + gap) {
      bricks.push(h("div", { position: "absolute", left: bx, top: 0, width: bw, height: bh, borderRadius: 4, background: BRICK }));
    }
    rows.push(h("div", { position: "absolute", left: 0, top: y, width, height: bh, display: "flex" }, bricks));
  }
  return h("div", { position: "absolute", left: x, top: 0, width, height: H, overflow: "hidden", background: JOINT, display: "flex" }, rows);
}

let logoData: string | undefined;
function logo(): string {
  logoData ??= `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "logo.png")).toString("base64")}`;
  return logoData;
}

/** OGP 画像（PNG）を作る */
export async function renderOg(e: OgEntry): Promise<Uint8Array> {
  const title = cut(clean(e.title), 30);
  const desc = cut(clean(e.description), 50);
  const eyebrow = clean(e.eyebrow).toUpperCase();
  const host = new URL(import.meta.env.SITE ?? "https://example.com").host;
  const latin = `${eyebrow}${host}0123456789`;

  const fonts = [
    { name: "BIZ UDPGothic", data: await googleFont("BIZ UDPGothic", 700, title + desc + host), weight: 700 as const },
    { name: "BIZ UDPGothic", data: await googleFont("BIZ UDPGothic", 400, desc + host), weight: 400 as const },
    { name: "Oswald", data: await googleFont("Oswald", 700, latin), weight: 700 as const },
  ];

  const titleSize = Array.from(title).length > 14 ? 60 : 76;
  const panel = h(
    "div",
    {
      position: "absolute", left: 90, top: 0, right: 90, bottom: 0,
      background: "#fff", display: "flex", flexDirection: "column",
      padding: "70px 70px 56px", borderTop: `12px solid ${RED}`,
    },
    [
      { type: "img", props: { src: logo(), width: 318, height: 53, style: { width: 318, height: 53 } } },
      h("div", { display: "flex", flexDirection: "column", marginTop: 56, flexGrow: 1 }, [
        eyebrow ? h("div", { fontFamily: "Oswald", fontSize: 30, letterSpacing: 4, color: RED, marginBottom: 10 }, eyebrow) : null,
        h("div", { fontFamily: "BIZ UDPGothic", fontWeight: 700, fontSize: titleSize, lineHeight: 1.25, color: "#1d1d22" }, title),
        desc ? h("div", { fontFamily: "BIZ UDPGothic", fontWeight: 400, fontSize: 30, lineHeight: 1.6, color: "#62626c", marginTop: 22 }, desc) : null,
      ].filter(Boolean)),
      h("div", { display: "flex", borderTop: "2px solid #e8e8ec", paddingTop: 22, fontFamily: "BIZ UDPGothic", fontWeight: 700, fontSize: 26, color: "#62626c" }, host),
    ],
  );

  const svg = await satori(
    h("div", { width: W, height: H, display: "flex", position: "relative", background: JOINT }, [brickColumn(0, 90), brickColumn(W - 90, 90), panel]) as never,
    { width: W, height: H, fonts },
  );
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}
