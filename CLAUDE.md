# teach

Self-study courses, one per subject, built with the `/teach` skill and published at
**https://learn.smalldetour.app**. The user works from Claude Code on their phone: they
prompt, the change lands on `main`, and Cloudflare deploys it. Nobody runs anything on a
computer, so every step below must work from a cloud session.

## Layout

```
.claude/skills/teach/     the /teach skill (MIT, copied from mattpocock-skills and adapted:
                          the workspace is a subject folder, and lessons end with a link)
subjects/<slug>/          one teaching workspace per subject, laid out as the skill describes:
    MISSION.md            "# Mission: <Topic>" — the build takes the subject's name from this line
    NOTES.md, RESOURCES.md, learning-records/
    lessons/*.html        published
    reference/*.html      published
    assets/*              published
    index.html            published if present; otherwise the build generates a subject home
scripts/build.mjs         builds dist/ (no dependencies, plain Node)
wrangler.jsonc            Cloudflare Worker that serves dist/ as static files
```

- **A new subject is a new folder.** `/teach <topic>` with no matching subject: pick a short
  dash-case slug (`sourdough`, `rust`, `yoga`), create `subjects/<slug>/`, and start with the
  mission interview. The home page lists it on the next deploy; nothing else needs registering.
- **What gets published:** only `lessons/`, `reference/`, `assets/` and `index.html` of each
  subject. `MISSION.md`, `NOTES.md`, `RESOURCES.md` and `learning-records/` stay in the repo
  and never reach the site.
- **Never edit `dist/`.** It is rebuilt on every deploy and is git-ignored.

## Writing pages

- Every page needs a `<title>`: the generated subject home lists pages by it.
- Link with relative paths only (`../reference/glossary.html`, `../assets/course.css`).
  Each subject is served under `/<slug>/`, so a root-relative link like `/assets/x.css` breaks.
- **Phone first.** The user studies on a phone: a layout that fits 375px wide, tap targets at
  least 44px, no hover-only controls, and audio or mic features that work in mobile Safari.
- **No server yet.** The site is static. Keep quiz scores and spaced-review state in
  `localStorage`, keyed by subject (`<slug>:…`), and wrap every read and write in try/catch.
  The teacher cannot see that state, so ask the user how a lesson went and record it in
  `NOTES.md` or a learning record.
- Each subject's `assets/` holds its own components. Copy a component from another subject
  when it fits rather than linking across subjects.

## Finishing a change

1. Run `node scripts/build.mjs`. It fails on a page without a `<title>` or a missing local link.
2. Commit, push, and open a pull request.
3. Merge it into `main` if you are able to; otherwise give the user the pull request link to
   merge from the GitHub app. Cloudflare deploys `main` about a minute after the merge.
4. End with the lesson's address:
   `https://learn.smalldetour.app/<slug>/lessons/<file-without-.html>`.
   Before the merge, Cloudflare comments a preview link on the pull request.
