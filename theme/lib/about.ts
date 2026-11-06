// HAnDA: 概要ページ（handa.config.ts の home.about）の下に続けて載せるページ
// （半田市とは・赤レンガ建物とは など）を集める。概要ページの目次・トップの ABOUT 欄・共有用画像で使う。
//
// 載せ方：Cosense のページに  #about/5  のようなタグを付ける（ページ名は関係ない）
//   - 数字が並び順（小さいほど上。目次の番号になる）。数字の同じものはタイトル順
//   - handa.config.ts を書き換えずに、Cosense だけで増やせる
//   - / の入ったタグはサイト上には表示されない
import { getCollection, type CollectionEntry } from "astro:content";
import { handaConfig } from "./config";

type Entry = CollectionEntry<"pages">;
const ABOUT_TAG = /^(?:about|概要)\/(\d+)$/i;

export async function loadAboutMore(): Promise<Entry[]> {
  const pages = await getCollection("pages");
  const mainTitle = handaConfig.home.about;
  const items = new Map<string, { entry: Entry; order: number }>();

  // Cosense の #about/番号 タグ
  for (const entry of pages) {
    if (entry.data.title === mainTitle) continue;
    for (const tag of entry.data.tags) {
      const m = tag.match(ABOUT_TAG);
      if (m) {
        items.set(entry.data.title, { entry, order: Number(m[1]) });
        break;
      }
    }
  }

  return [...items.values()]
    .sort((a, b) => a.order - b.order || a.entry.data.title.localeCompare(b.entry.data.title, "ja"))
    .map((x) => x.entry);
}
