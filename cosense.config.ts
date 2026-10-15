import { defineCosenseSite } from "@cosense-site-kit/core";

// Per-site values are NOT hard-coded here, so a copy of this template needs
// no code edits to be pointed at your own site:
//
//   * source.project — your PUBLIC Cosense project name. Set it as a GitHub
//     repository *variable* named COSENSE_PROJECT
//     (Settings → Secrets and variables → Actions → Variables). Locally, run
//     e.g. `COSENSE_PROJECT=my-notes npm run dev`. Left unset, the build stops
//     with a message instead of silently building someone else's site.
//   * site.baseUrl / site.base — injected by the deploy workflow
//     (PAGES_ORIGIN / PAGES_BASE_PATH, from actions/configure-pages), which
//     handles both user/org pages (served at "/") and project pages (served
//     at "/REPO"). The literals below are only fallbacks for local builds.
//   * site.title — defaults to the repository name; edit it to taste.
//
// The upstream demo (https://shinyaoguri.github.io/cosense-theme-default/)
// builds from the public Cosense project https://scrapbox.io/cosense-theme-default/
// by setting COSENSE_PROJECT=cosense-theme-default as its repository variable.
const project = process.env.COSENSE_PROJECT;
if (!project) {
  throw new Error(
    "COSENSE_PROJECT is not set. Set your public Cosense project name as the " +
      "COSENSE_PROJECT repository variable (Settings → Secrets and variables → " +
      "Actions → Variables), or run locally with COSENSE_PROJECT=<name>.",
  );
}

// "owner/repo" is provided by GitHub Actions; local builds fall back to a generic name.
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineCosenseSite({
  site: {
    title: repoName || "My Cosense Site",
    description: "A site published from Cosense",
    baseUrl: process.env.PAGES_ORIGIN || "http://localhost:4321",
    base: process.env.PAGES_BASE_PATH || "/",
    lang: "ja",
  },

  source: {
    type: "cosense",
    project,
  },

  publish: {
    default: "none",
    includeTags: ["publish"],
    excludeTags: ["draft", "private", "internal"],
  },

  routing: {
    slug: "metadata-or-encoded-title",
  },

  deploy: {
    target: "github-pages",
    // build.yml の 15 分枠 (更新が無ければビルドを省く)。1 日 1 回の強制
    // ビルド枠は build.yml 側にだけある。
    schedule: "2,17,32,47 * * * *",
  },
});
