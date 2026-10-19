// HAnDA: お問い合わせの内容を作る。お問い合わせページ（/contact）とトップのお問い合わせ欄で使う。
//
//   Cosense の「お問い合わせ」ページ（ページ名は handa.config.ts の contact.page）に書くもの：
//     - 紹介文（ふつうの文章の行）。「ーーーーー」などの区切り線より下の行は、紹介文としては表示しない
//     - SNS アカウント（1 行に 1 つ）。次のどの書き方でも OK
//         X：@handa_project        （おすすめの書き方。「:」「：」「@」「＠」どれでも可）
//         Instagram handa_project
//         https://www.tiktok.com/@handa.project
//     - メールアドレス（1 行）。「メール：xxx@example.com」（「Mail xxx@…」やアドレスだけでも可）
//   handa.config.ts の contact に書くもの：ページ名・見出し、メールの件名・本文のひな形、関連研究室など
//   （Cosense のページが無い／アカウントが書かれていないときは、handa.config.ts の intro・accounts を使う）
import { type CollectionEntry, getCollection } from "astro:content";
import { handaConfig } from "./config";

export interface Account {
  service: string;
  handle?: string;
  /** 未設定（handle が空など）のときは undefined → 「準備中」表示 */
  url?: string;
}

export interface Mail {
  address?: string;
  /** address があるとき、件名と本文のひな形入りの mailto: リンク */
  href?: string;
}

export interface ContactData {
  title: string;
  en: string;
  /** 紹介文（1 要素 = 1 段落） */
  intro: string[];
  accounts: Account[];
  mail?: Mail;
  lab?: { name: string; org?: string; url?: string };
  sns: { service: string; label?: string; url: string }[];
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const safeUrl = (v: unknown) => {
  const s = str(v);
  return s && /^(https?:|mailto:)/i.test(s) ? s : undefined;
};

// handle からアカウントのホーム URL を作る
const PROFILE_URL: Record<string, (h: string) => string> = {
  x: (h) => `https://x.com/${h}`,
  twitter: (h) => `https://x.com/${h}`,
  instagram: (h) => `https://www.instagram.com/${h}/`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
};

function toAccount(x: { service?: string; handle?: string; url?: string }): Account | null {
  const service = str(x.service);
  if (!service) return null;
  const rawHandle = str(x.handle)?.replace(/^@/, "");
  const handle = rawHandle && /^[A-Za-z0-9._-]+$/.test(rawHandle) ? rawHandle : undefined;
  const make = PROFILE_URL[service.toLowerCase()];
  const url = safeUrl(x.url) ?? (handle && make ? make(handle) : undefined);
  return { service, handle, url };
}

// URL からサービス名とアカウント名を推定する
const DOMAIN_SERVICE: [RegExp, string][] = [
  [/^(?:www\.)?(?:x|twitter)\.com$/i, "X"],
  [/^(?:www\.)?instagram\.com$/i, "Instagram"],
  [/^(?:www\.|vt\.|vm\.)?tiktok\.com$/i, "TikTok"],
  [/^(?:www\.)?youtube\.com$/i, "YouTube"],
  [/^(?:www\.)?facebook\.com$/i, "Facebook"],
];
const SERVICE_NAMES: Record<string, string> = {
  x: "X", twitter: "X", instagram: "Instagram", insta: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook",
};

function accountFromLine(line: string): Account | null {
  const t = line.trim();
  // URL だけの行
  const urlMatch = t.match(/^https?:\/\/\S+$/);
  if (urlMatch) {
    try {
      const u = new URL(t);
      const svc = DOMAIN_SERVICE.find(([re]) => re.test(u.hostname))?.[1];
      if (!svc) return null;
      const first = u.pathname.split("/").filter(Boolean)[0];
      const handle = first?.replace(/^@/, "");
      return { service: svc, handle: handle && /^[A-Za-z0-9._-]+$/.test(handle) ? handle : undefined, url: u.href };
    } catch {
      return null;
    }
  }
  // 「X @handa_project」「Instagram: handa_project」
  const m = t.match(/^([A-Za-z]+)\s*[:：]?\s*[@＠]?([A-Za-z0-9._-]+)$/);
  if (m && SERVICE_NAMES[m[1].toLowerCase()]) {
    return toAccount({ service: SERVICE_NAMES[m[1].toLowerCase()], handle: m[2] });
  }
  return null;
}

type Inline = { type: string; value?: string; href?: string; title?: string; name?: string; children?: Inline[] };
function lineText(nodes: Inline[] | undefined): string {
  return (nodes ?? [])
    .map((n) => {
      if (n.type === "text" || n.type === "code") return n.value ?? "";
      if (n.type === "link") return n.href ?? "";
      if (n.type === "pageLink") return n.title ?? "";
      if (n.type === "tag") return "";
      return lineText(n.children);
    })
    .join("");
}

export async function findContactPage(): Promise<CollectionEntry<"pages"> | undefined> {
  const title = handaConfig.contact.page;
  if (!title) return undefined;
  return (await getCollection("pages")).find((e) => e.data.title === title);
}

export async function loadContact(): Promise<ContactData> {
  const c = handaConfig.contact;

  // Cosense のページから紹介文とアカウントを読む
  const page = await findContactPage();
  const intro: string[] = [];
  const pageAccounts: Account[] = [];
  let pageMail: string | undefined;
  // 区切り線（ー・-・―・─・＝・= を 3 つ以上並べた行）より下は紹介文に入れない
  let afterSeparator = false;
  for (const b of (page?.data.blocks ?? []) as unknown as { type: string; url?: string; children?: Inline[] }[]) {
    // URL だけの行は「埋め込み」扱いになるので、その URL を読む
    if (b.type === "embed" && b.url) {
      const acc = accountFromLine(b.url);
      if (acc) pageAccounts.push(acc);
      continue;
    }
    if (b.type !== "paragraph" && b.type !== "list") continue;
    const text = lineText(b.children).trim();
    if (!text) continue;
    if (/^[ー\-－―—─━=＝_＿〜~]{3,}$/.test(text)) {
      afterSeparator = true;
      continue;
    }
    // SNS アカウントの行
    const acc = accountFromLine(text);
    if (acc) {
      pageAccounts.push(acc);
      continue;
    }
    // メールアドレスの行（「メール：xxx」「Mail xxx」「mailto:xxx」やアドレスだけ）
    const mailMatch = text.match(/^(?:(?:e-?mail|mail|メール(?:アドレス)?)\s*[:：]?\s*)?(?:mailto:)?([^\s@<>"：:＠]+@[^\s@<>"]+\.[^\s@<>"]+)$/i);
    if (mailMatch) {
      pageMail = mailMatch[1];
      continue;
    }
    // 「メール：」だけの行（アドレス未記入）→ 準備中表示
    if (/^(?:e-?mail|mail|メール(?:アドレス)?)\s*[:：]?\s*$/i.test(text)) continue;
    if (!afterSeparator) intro.push(text);
  }

  const accounts = pageAccounts.length
    ? pageAccounts
    : (c.accounts ?? []).map(toAccount).filter((x): x is Account => x !== null);
  let mail: Mail | undefined;
  if (c.mail || pageMail) {
    // アドレスは Cosense のページに書かれていればそちらを優先
    const raw = pageMail ?? str(c.mail?.address);
    const address = raw && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(raw) ? raw : undefined;
    const subject = str(c.mail?.subject) ?? "【HAnDA Project】お問い合わせ";
    const body = c.mail?.body ?? "お名前：\nご所属：\nお問い合わせ内容：\n";
    mail = {
      address,
      href: address
        ? `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        : undefined,
    };
  }
  const lab = c.lab && str(c.lab.name) ? { name: c.lab.name, org: str(c.lab.org), url: safeUrl(c.lab.url) } : undefined;
  const sns = (c.pickups ?? [])
    .map((x) => ({ service: str(x.service) ?? "", label: str(x.label), url: safeUrl(x.url) ?? "" }))
    .filter((x) => x.service && x.url);
  return {
    title: c.title,
    en: c.en ?? "Contact",
    intro: intro.length ? intro : c.intro ? [c.intro] : [],
    accounts,
    mail,
    lab,
    sns,
  };
}

/** ボタンに表示するサービス名（X は「𝕏」の文字で X らしく見せる） */
export function serviceMark(service: string): string {
  return service.toLowerCase() === "x" ? "𝕏" : service;
}
