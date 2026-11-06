import { getCollection } from "astro:content";
import type { CosenseSitePage } from "@cosense-site-kit/core";
import { buildPreviewData, type PreviewSource } from "@cosense-site-kit/theme-utils";
import { displayName, isMemberPage, memberInfo } from "../lib/members";

// /link-previews.json — a compact slug → {title, summary, image} map fetched
// lazily by the LinkPreview client to render hover/focus cards over internal
// links. Kept small (clipped summaries) so it's cheap to load once per visit.
export async function GET(): Promise<Response> {
  // getCollection is untyped under tsc (real types come from `astro sync`).
  const pages = (await getCollection("pages")) as { data: CosenseSitePage }[];
  const sources: PreviewSource[] = pages.map((e) => ({
    slug: e.data.slug,
    // HAnDA: メンバーは本文を出さない。名前の（ ）を外し、説明は学科・学年（タグから）
    title: isMemberPage(e.data.tags) ? displayName(e.data.title) : e.data.title,
    summary: isMemberPage(e.data.tags) ? memberInfo(e.data.tags).line : e.data.summary,
    image: e.data.image,
  }));
  return new Response(JSON.stringify(buildPreviewData(sources)), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
