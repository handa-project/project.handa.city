import { defineCollection } from "astro:content";
import { cosenseLoader, cosenseSchema } from "@cosense-site-kit/astro";
import { markBigText } from "../theme/lib/bigText";

// HAnDA: Cosense で文字を大きくしたところ（[** ] など）に印を付けてから取り込む（theme/lib/bigText.ts）
const base = cosenseLoader({ configFile: "./cosense.config.ts" });
const loader: typeof base = {
  ...base,
  load: (ctx) =>
    base.load({
      ...ctx,
      parseData: (entry) => ctx.parseData({ ...entry, data: markBigText(entry.data as { id?: string; blocks?: unknown[] }) as typeof entry.data }),
    }),
};

const pages = defineCollection({
  loader,
  schema: cosenseSchema,
});

export const collections = { pages };
