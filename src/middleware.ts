// HAnDA: できあがったページを最後に書き換える場所。
//   - Gyazo の写真を軽くしてサイトから配る（theme/lib/images.ts）
//   - 写真に説明（alt）を付ける（theme/lib/alt.ts）
//   - 本文中のメンバーへのリンクは、名前の後ろの（学科）などを外して表示する（theme/lib/members.ts）
import { defineMiddleware } from "astro:middleware";
import { optimizeImages } from "../theme/lib/images";
import { addAltText } from "../theme/lib/alt";
import { memberDisplayNames } from "../theme/lib/members";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
let names: Promise<Map<string, string>> | undefined;
/** リンクの文字が「半田太郎（建築学科）」のようなメンバーページ名なら、「半田太郎」にする */
async function stripMemberSuffix(html: string): Promise<string> {
  names ??= memberDisplayNames();
  for (const [title, name] of await names) {
    html = html.split(`>${escapeHtml(title)}</a>`).join(`>${escapeHtml(name)}</a>`);
  }
  return html;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const res = await next();
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return res;
  const body = await res.text();
  const out = await stripMemberSuffix(await optimizeImages(addAltText(body)));
  return new Response(out, { status: res.status, statusText: res.statusText, headers: res.headers });
});
