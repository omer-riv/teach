# teach

Self-study courses made with the `/teach` skill, published at https://teach.smalldetour.app.
See `CLAUDE.md` for how the repo works.

## Use it (from the phone)

In Claude Code on this repo, type `/teach <what you want to learn>`. A new topic becomes a new
subject in `subjects/<slug>/`; an existing one gets its next lesson. Merge the pull request and
the site updates about a minute later.

## One-time setup

1. **Claude Code on the web:** install the Claude GitHub app on this repo (claude.ai/code asks
   for it the first time you pick the repo). No environment variables or network access needed.
2. **Cloudflare:** Workers & Pages → Create → Import a repository → this repo.
   Keep the defaults (build command empty, deploy command `npx wrangler deploy`), and turn on
   builds for non-production branches so pull requests get a preview link.
   The first deploy of `main` creates `teach.smalldetour.app` from `wrangler.jsonc`.
3. Optional: to keep the site private, add a Cloudflare Access application for
   `teach.smalldetour.app` with an email one-time PIN policy.

## Local commands

    npm install
    npm run build     # builds dist/ and checks titles and local links
    npm run dev       # serves the site with wrangler
