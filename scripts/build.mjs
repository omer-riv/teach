#!/usr/bin/env node
// Builds dist/, the static site Cloudflare serves at teach.smalldetour.app.
//
//   node scripts/build.mjs
//
// Copies the public parts of every subjects/<slug>/ (lessons, reference, assets, index.html)
// to dist/<slug>/, generates a home page for any subject without its own index.html, and
// generates the site home listing every subject. Fails when a page has no <title> or links
// to a local file that doesn't exist, so a broken lesson never deploys.
// Plain Node with no dependencies, so it runs the same in a cloud session and in Cloudflare's build.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const subjectsDir = path.join(repoRoot, "subjects");
const distDir = path.join(repoRoot, "dist");

/** Folders and files of a subject workspace that are published. Everything else stays private. */
const publishedEntryNames = ["lessons", "reference", "assets", "index.html"];

/**
 * One HTML page of a subject, as listed on the subject's home page.
 * @typedef {object} PageEntry
 * @property {string} fileName  File name inside lessons/ or reference/, e.g. "0001-first-steps.html".
 * @property {string} title     Text of the page's <title>.
 */

/**
 * Everything the generated pages need to know about one subject.
 * @typedef {object} Subject
 * @property {string} slug                 Folder name under subjects/, also the URL path segment.
 * @property {string} name                 Display name, from "# Mission: <name>" in MISSION.md.
 * @property {PageEntry[]} lessons         Lessons in file-name order (they are numbered 0001-…).
 * @property {PageEntry[]} referencePages  Reference documents in file-name order.
 * @property {boolean} hasOwnIndex         Whether the subject ships its own index.html.
 */

function main() {
    fs.rmSync(distDir, { recursive: true, force: true });
    fs.mkdirSync(distDir, { recursive: true });

    const subjects = readSubjects();
    for (const subject of subjects) {
        copySubjectToDist(subject.slug);
        if (!subject.hasOwnIndex) {
            writeFile(path.join(distDir, subject.slug, "index.html"), renderSubjectHome(subject));
        }
    }
    writeFile(path.join(distDir, "index.html"), renderSiteHome(subjects));
    writeFile(path.join(distDir, "404.html"), renderNotFoundPage());

    const brokenLinks = findBrokenLocalLinks(distDir);
    if (brokenLinks.length > 0) {
        console.error("Broken local links:");
        for (const brokenLink of brokenLinks) {
            console.error(`  ${brokenLink.pagePath} → ${brokenLink.target}`);
        }
        process.exit(1);
    }

    const lessonCount = subjects.reduce((total, subject) => total + subject.lessons.length, 0);
    console.log(`Built dist/: ${subjects.length} subject(s), ${lessonCount} lesson(s).`);
}

/** @returns {Subject[]} */
function readSubjects() {
    if (!fs.existsSync(subjectsDir)) {
        return [];
    }
    const subjectSlugs = fs
        .readdirSync(subjectsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => entry.name)
        .sort();
    return subjectSlugs.map(readSubject);
}

/** @returns {Subject} */
function readSubject(slug) {
    const subjectDir = path.join(subjectsDir, slug);
    return {
        slug,
        name: readSubjectName(subjectDir) ?? titleCaseSlug(slug),
        lessons: readPageEntries(path.join(subjectDir, "lessons")),
        referencePages: readPageEntries(path.join(subjectDir, "reference")),
        hasOwnIndex: fs.existsSync(path.join(subjectDir, "index.html")),
    };
}

/** The topic from MISSION.md's "# Mission: <Topic>" heading, or null before the mission is written. */
function readSubjectName(subjectDir) {
    const missionPath = path.join(subjectDir, "MISSION.md");
    if (!fs.existsSync(missionPath)) {
        return null;
    }
    const headingMatch = fs.readFileSync(missionPath, "utf8").match(/^#\s+(?:Mission:\s*)?(.+?)\s*$/m);
    return headingMatch ? headingMatch[1] : null;
}

function titleCaseSlug(slug) {
    const words = slug.split("-").filter((word) => word.length > 0);
    return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

/** @returns {PageEntry[]} */
function readPageEntries(pagesDir) {
    if (!fs.existsSync(pagesDir)) {
        return [];
    }
    const htmlFileNames = fs
        .readdirSync(pagesDir)
        .filter((fileName) => fileName.endsWith(".html"))
        .sort();
    return htmlFileNames.map((fileName) => {
        const pagePath = path.join(pagesDir, fileName);
        const title = readHtmlTitle(fs.readFileSync(pagePath, "utf8"));
        if (title === null) {
            failBuild(`${path.relative(repoRoot, pagePath)} has no <title>. Every page needs one.`);
        }
        return { fileName, title };
    });
}

function readHtmlTitle(html) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!titleMatch) {
        return null;
    }
    const title = decodeBasicEntities(titleMatch[1]).replace(/\s+/g, " ").trim();
    return title.length > 0 ? title : null;
}

function copySubjectToDist(slug) {
    for (const entryName of publishedEntryNames) {
        const sourcePath = path.join(subjectsDir, slug, entryName);
        if (fs.existsSync(sourcePath)) {
            fs.cpSync(sourcePath, path.join(distDir, slug, entryName), { recursive: true });
        }
    }
}

/**
 * Every href/src in the built HTML that points at a local file which isn't there.
 * @returns {{pagePath: string, target: string}[]}
 */
function findBrokenLocalLinks(rootDir) {
    const brokenLinks = [];
    for (const pagePath of listFilesRecursively(rootDir).filter((filePath) => filePath.endsWith(".html"))) {
        const html = fs.readFileSync(pagePath, "utf8");
        for (const attributeMatch of html.matchAll(/\s(?:href|src)\s*=\s*["']([^"']*)["']/gi)) {
            const target = attributeMatch[1];
            if (!isLocalLink(target)) {
                continue;
            }
            const targetPath = target.split(/[?#]/)[0];
            if (targetPath === "") {
                continue; // a same-page anchor such as "#quiz"
            }
            const resolvedPath = targetPath.startsWith("/")
                ? path.join(rootDir, targetPath)
                : path.resolve(path.dirname(pagePath), decodeURI(targetPath));
            if (!servedPathExists(resolvedPath)) {
                brokenLinks.push({ pagePath: path.relative(rootDir, pagePath), target });
            }
        }
    }
    return brokenLinks;
}

function isLocalLink(target) {
    // Anything with a scheme (https:, mailto:, data:, javascript:) or protocol-relative "//" is external.
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(target);
    return !hasScheme && !target.startsWith("//") && !target.includes("${");
}

/** Cloudflare serves "/a/b" from a/b, a/b.html or a/b/index.html, so a link to any of them works. */
function servedPathExists(resolvedPath) {
    const candidatePaths = [resolvedPath, `${resolvedPath}.html`, path.join(resolvedPath, "index.html")];
    return candidatePaths.some((candidatePath) => fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile());
}

function listFilesRecursively(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const entryPath = path.join(dir, entry.name);
        return entry.isDirectory() ? listFilesRecursively(entryPath) : [entryPath];
    });
}

function writeFile(filePath, contents) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
}

function failBuild(message) {
    console.error(message);
    process.exit(1);
}

// ---------- generated pages ----------

/** @param {Subject[]} subjects */
function renderSiteHome(subjects) {
    const subjectItems = subjects.map((subject) => {
        const lessonCountLabel = subject.lessons.length === 1 ? "1 lesson" : `${subject.lessons.length} lessons`;
        const latestLesson = subject.lessons.at(-1);
        const latestLine = latestLesson ? `<span class="meta">Latest: ${escapeHtml(latestLesson.title)}</span>` : "";
        return `
            <li>
                <a class="card" href="${encodeURIComponent(subject.slug)}/">
                    <span class="card-title">${escapeHtml(subject.name)}</span>
                    <span class="meta">${lessonCountLabel}</span>
                    ${latestLine}
                </a>
            </li>`;
    });
    const subjectList = subjects.length > 0
        ? `<ul class="cards">${subjectItems.join("")}\n        </ul>`
        : `<p class="empty">No subjects yet. Start one from Claude Code with <code>/teach &lt;what you want to learn&gt;</code>.</p>`;
    return renderPage({
        title: "Learn",
        body: `
        <header>
            <h1>Learn</h1>
            <p class="lede">Courses in progress, one lesson at a time.</p>
        </header>
        ${subjectList}`,
    });
}

/** @param {Subject} subject */
function renderSubjectHome(subject) {
    const lessonItems = subject.lessons.map((lesson, lessonIndex) => `
                <li><a href="lessons/${encodeURIComponent(lesson.fileName)}"><span class="num">${lessonIndex + 1}</span>${escapeHtml(lesson.title)}</a></li>`);
    const referenceItems = subject.referencePages.map((referencePage) => `
                <li><a href="reference/${encodeURIComponent(referencePage.fileName)}">${escapeHtml(referencePage.title)}</a></li>`);
    const lessonsSection = lessonItems.length > 0
        ? `<section><h2>Lessons</h2><ol class="list">${lessonItems.join("")}\n            </ol></section>`
        : `<p class="empty">No lessons yet. Ask your teacher for the first one.</p>`;
    const referenceSection = referenceItems.length > 0
        ? `<section><h2>Reference</h2><ul class="list">${referenceItems.join("")}\n            </ul></section>`
        : "";
    return renderPage({
        title: subject.name,
        body: `
        <nav><a href="../">← All subjects</a></nav>
        <header><h1>${escapeHtml(subject.name)}</h1></header>
        ${lessonsSection}
        ${referenceSection}`,
    });
}

function renderNotFoundPage() {
    return renderPage({
        title: "Not found",
        body: `
        <header><h1>Not found</h1></header>
        <p>That page doesn't exist (yet). <a href="/">Back to all subjects</a>.</p>`,
    });
}

function renderPage({ title, body }) {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>${generatedPageStyles}</style>
</head>
<body>
    <main>${body}
    </main>
</body>
</html>
`;
}

const generatedPageStyles = `
        :root {
            --bg: #fbfaf7; --surface: #ffffff; --text: #1f1d1a; --muted: #6b665e;
            --line: #e6e2da; --accent: #9a3b1b;
            color-scheme: light dark;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #161513; --surface: #1f1d1a; --text: #ece8e1; --muted: #a39d93;
                --line: #34312c; --accent: #e3825f;
            }
        }
        * { box-sizing: border-box; }
        body {
            margin: 0; background: var(--bg); color: var(--text);
            font: 18px/1.55 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
        }
        main { max-width: 40rem; margin: 0 auto; padding: 2.5rem 16px 4rem; }
        h1 { font-size: 2.2rem; line-height: 1.15; margin: 0 0 0.3rem; font-weight: 600; }
        h2 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted);
             font-family: -apple-system, system-ui, sans-serif; margin: 2.2rem 0 0.6rem; font-weight: 600; }
        .lede { color: var(--muted); margin: 0 0 2rem; }
        a { color: var(--accent); }
        nav { font-family: -apple-system, system-ui, sans-serif; font-size: 0.9rem; margin-bottom: 1.5rem; }
        nav a { text-decoration: none; }
        .cards, .list { list-style: none; margin: 0; padding: 0; }
        .cards li + li { margin-top: 0.8rem; }
        .card {
            display: flex; flex-direction: column; gap: 0.15rem; padding: 1rem 1.1rem;
            background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
            text-decoration: none; color: inherit;
        }
        .card:active { border-color: var(--accent); }
        .card-title { font-size: 1.25rem; font-weight: 600; color: var(--accent); }
        .meta { font-family: -apple-system, system-ui, sans-serif; font-size: 0.85rem; color: var(--muted); }
        .list li { border-top: 1px solid var(--line); }
        .list li:last-child { border-bottom: 1px solid var(--line); }
        .list a { display: flex; gap: 0.8rem; align-items: baseline; min-height: 44px; padding: 0.7rem 0;
                  text-decoration: none; color: inherit; }
        .num { font-family: -apple-system, system-ui, sans-serif; font-size: 0.85rem; color: var(--muted);
               min-width: 1.5rem; font-variant-numeric: tabular-nums; }
        .empty { color: var(--muted); }
        code { font-size: 0.85em; background: var(--surface); border: 1px solid var(--line);
               border-radius: 4px; padding: 0.05em 0.3em; }
`;

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

/** Titles are read from HTML, so undo the common entities before escapeHtml encodes them again. */
function decodeBasicEntities(text) {
    return text
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll("&amp;", "&");
}

main();
