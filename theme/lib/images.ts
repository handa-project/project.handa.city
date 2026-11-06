// HAnDA: 写真を軽くする。
// Cosense に貼った Gyazo の写真は、そのままだと元の大きな画像を Gyazo から直接読むため、
// スマホでは特に表示が遅い。そこでビルドのときに写真をダウンロードして、
//   - WebP 形式に変換し
//   - 幅 160〜1600px の何段階かの大きさを作り
//   - サイトと同じ場所から配る
// ようにする。ブラウザは画面の幅に合った大きさだけを読む（srcset / sizes）。
// src/middleware.ts から、できあがった全ページの HTML に対して使う。
// 写真のダウンロードに失敗したときは、元の Gyazo の URL のまま表示する（ビルドは止めない）。
import { getImage } from "astro:assets";

const GYAZO = /^https:\/\/gyazo\.com\/([0-9a-f]{32})(?:\/(?:thumb|max_size)\/\d+)?/;
const WIDTHS = [160, 320, 480, 800, 1200, 1600];

type Optimized = { src: string; srcset: string; width: number; height: number };
const cache = new Map<string, Promise<Optimized | null>>();

function optimize(id: string): Promise<Optimized | null> {
  let p = cache.get(id);
  if (!p) {
    p = (async () => {
      try {
        const img = await getImage({
          src: `https://gyazo.com/${id}/max_size/1600`,
          inferSize: true,
          widths: WIDTHS,
          format: "webp",
          quality: 78,
        });
        return {
          src: img.src,
          srcset: img.srcSet.attribute,
          width: Number(img.attributes.width),
          height: Number(img.attributes.height),
        };
      } catch (err) {
        console.warn(`[handa] 写真を軽くできなかったので、元の URL のまま使います: ${id} (${(err as Error).message})`);
        return null;
      }
    })();
    cache.set(id, p);
  }
  return p;
}

// どこに置かれた写真かで、表示される幅（sizes）を決める。
// parent = 写真のすぐ外側のタグの class、w = 写真の元の幅
function sizesFor(tag: string, parent: string, w: number): string {
  const cap = (px: number) => `${Math.min(w, px)}px`;
  if (/hero-glow/.test(tag)) return "160px"; // スライドの光（大きくぼかすので小さい画像で十分）
  if (/hero-slide/.test(tag)) return "(max-width: 720px) 100vw, 68rem"; // トップのスライド
  if (/member-card/.test(parent)) return "64px"; // メンバーの顔写真
  if (/card-thumb|\bthumb\b|about-card/.test(parent)) return "(max-width: 720px) 45vw, 360px"; // 一覧のカード
  if (/about-photo/.test(parent)) return "(max-width: 720px) 90vw, 440px"; // トップの ABOUT の写真
  // 本文の写真など（元の大きさより大きくは表示しない）
  return `(max-width: 720px) min(92vw, ${cap(800)}), ${cap(800)}`;
}

const setAttr = (tag: string, name: string, value: string) => {
  const re = new RegExp(`\\s${name}="[^"]*"`);
  return re.test(tag) ? tag.replace(re, ` ${name}="${value}"`) : tag.replace(/^<img\b/, `<img ${name}="${value}"`);
};

/** HTML の中の Gyazo の写真を、軽くした写真に差し替える */
export async function optimizeImages(html: string): Promise<string> {
  if (!html.includes("gyazo.com/")) return html;
  const tags = [...html.matchAll(/<img\b[^>]*>/g)];
  const results = await Promise.all(
    tags.map(async (m) => {
      const src = m[0].match(/\ssrc="([^"]*)"/)?.[1] ?? "";
      const id = src.match(GYAZO)?.[1];
      return id ? optimize(id) : null;
    }),
  );
  let out = "";
  let last = 0;
  tags.forEach((m, i) => {
    const opt = results[i];
    if (!opt) return;
    const start = m.index!;
    let tag = m[0];
    const before = html.slice(Math.max(0, start - 400), start);
    const parentTag = [...before.matchAll(/<[a-z][^>]*>/gi)].at(-1)?.[0] ?? "";
    const parent = parentTag.match(/\sclass="([^"]*)"/)?.[1] ?? "";
    tag = setAttr(tag, "src", opt.src);
    tag = setAttr(tag, "srcset", opt.srcset);
    tag = setAttr(tag, "sizes", sizesFor(tag, parent, opt.width));
    if (!/\swidth="/.test(tag)) tag = setAttr(tag, "width", String(opt.width));
    if (!/\sheight="/.test(tag)) tag = setAttr(tag, "height", String(opt.height));
    // 縦横比（handa.css で、縦長の写真を無理に横へ広げないために使う）
    if (opt.height > 0 && !/--ar:/.test(tag)) {
      const ar = `--ar:${(opt.width / opt.height).toFixed(4)}`;
      const style = tag.match(/\sstyle="([^"]*)"/)?.[1];
      tag = setAttr(tag, "style", style ? `${style.replace(/;?\s*$/, "")};${ar}` : ar);
    }
    out += html.slice(last, start) + tag;
    last = start + m[0].length;
  });
  return out + html.slice(last);
}
