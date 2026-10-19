// HAnDA: サイトの骨組みは Cosense の .site ではなく、リポジトリの handa.config.ts から読む。
// テーマ内でもともと .site を読んでいた箇所（loadStructure）は、すべてこの loadStructure を使う。
import config from "../../handa.config";

export type NavItem = { label: string; page?: string; href?: string };

export interface Policy {
  slug: string;
  title: string;
  en?: string;
  intro?: string;
  sections: { heading: string; body: string[] }[];
  enacted?: string;
}

export const handaConfig = config as unknown as {
  site: { title: string; description?: string };
  nav: NavItem[];
  home: { about?: string; aboutMore?: string[]; slides?: string };
  intros: Partial<Record<"blog" | "works" | "members", string>>;
  tags: { blog: string; works: string };
  members?: { departments?: string[]; roles?: string[] };
  blogPageSize?: number;
  copyright: { holder: string };
  policies: Policy[];
  policyOwner?: string;
  contact: {
    /** 紹介文と SNS アカウントを書く Cosense のページ名（単独ページとしては公開されない） */
    page?: string;
    title: string;
    en?: string;
    intro?: string;
    accounts?: { service: string; handle?: string; url?: string }[];
    mail?: { address?: string; subject?: string; body?: string };
    pickups?: { service: string; label?: string; url: string }[];
    lab?: { name: string; org?: string; url?: string };
  };
};

/** テーマが期待する「サイト構造」の形に変換したもの（もとは .site から作られていた） */
const structure = {
  home: handaConfig.home.about ? { page: handaConfig.home.about } : undefined,
  nav: handaConfig.nav.map((n) => (n.page ? { label: n.label, page: n.page } : { label: n.label, href: n.href ?? "#" })),
  posts: { tag: handaConfig.tags.blog, limit: 10 },
  featured: [] as string[],
  redirects: {} as Record<string, string>,
  templates: {} as Record<string, string>,
  theme: undefined as { skin?: string } | undefined,
  favicon: undefined as string | undefined,
};

export async function loadStructure() {
  return structure;
}
