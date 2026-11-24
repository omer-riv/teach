// Memory-sizing drill: endless random problems with instant feedback.
//
// Markup:
//   <div class="sizing-drill widget" data-drill-id="weights" data-modes="weights,kv,capacity"></div>
//
// Modes (mixing several interleaves them, which builds better long-term recall):
//   weights   GB of weights for a model size and precision         (lesson 1)
//   kv        GB of KV cache for one conversation, from kB/token     (lesson 2)
//   capacity  how many conversations fit in a free-memory budget     (lesson 2)
// data-modes defaults to "weights". Answers within 10% count. Running totals are saved in
// localStorage under "<subject>:drill:<drill-id>", where <subject> comes from <body data-subject>.

(function () {
    const subject = document.body.dataset.subject || "course";

    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const fmt = (n) => (Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(1));

    const PRECISIONS = [
        { name: "bf16", bytes: 2 },
        { name: "fp8", bytes: 1 },
        { name: "int8", bytes: 1 },
        { name: "int4", bytes: 0.5 },
    ];
    const GPUS = [
        { name: "H100", gb: 80 },
        { name: "H200", gb: 141 },
    ];

    /** Each generator returns { prompt (HTML), answer (number), unit, explain(guess) }. */
    const GENERATORS = {
        weights() {
            const sizeB = pick([1, 3, 7, 8, 13, 32, 70, 123, 405]);
            const precision = pick(PRECISIONS);
            const gpu = pick(GPUS);
            const answer = sizeB * precision.bytes;
            const gpusNeeded = Math.ceil(answer / gpu.gb);
            const fit = gpusNeeded === 1
                ? `Fits on one ${gpu.name} (${gpu.gb} GB), leaving ${fmt(gpu.gb - answer)} GB for the KV cache.`
                : `More than one ${gpu.name} (${gpu.gb} GB): at least ${gpusNeeded} just for the weights.`;
            return {
                prompt: `${sizeB === 8 ? "An" : "A"} <strong>${sizeB}B</strong> model stored in <strong>${precision.name}</strong>. How many GB do its weights take?`,
                answer,
                unit: "GB",
                explain: () => `${sizeB} billion × ${precision.bytes} byte${precision.bytes === 1 ? "" : "s"} = ${fmt(answer)} GB. ${fit}`,
            };
        },
        kv() {
            const kbPerToken = pick([50, 100, 130, 160, 250, 330]);
            const tokens = pick([2000, 4000, 8000, 16000, 32000, 128000]);
            const answer = (kbPerToken * tokens) / 1e6;
            return {
                prompt: `A model's KV cache takes <strong>${kbPerToken} kB per token</strong>. How many GB for one <strong>${fmt(tokens)}-token</strong> conversation?`,
                answer,
                unit: "GB",
                explain: () => `${kbPerToken} kB × ${fmt(tokens / 1000)}k tokens = ${fmt(kbPerToken * tokens / 1000)} MB ≈ ${fmt(answer)} GB.`,
            };
        },
        capacity() {
            const freeGb = pick([20, 40, 60, 90, 120, 400]);
            const perConversationGb = pick([0.5, 1, 2, 4, 5, 10]);
            const answer = Math.floor(freeGb / perConversationGb);
            return {
                prompt: `<strong>${freeGb} GB</strong> is free after the weights. Each conversation's KV cache needs <strong>${fmt(perConversationGb)} GB</strong>. How many conversations fit at once?`,
                answer,
                unit: "",
                explain: () => `${freeGb} ÷ ${fmt(perConversationGb)} = ${fmt(answer)} conversations at once.`,
            };
        },
    };

    function load(key) {
        try { return JSON.parse(localStorage.getItem(key)) || { right: 0, tries: 0 }; }
        catch { return { right: 0, tries: 0 }; }
    }
    function save(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    }

    for (const root of document.querySelectorAll(".sizing-drill")) {
        const storageKey = `${subject}:drill:${root.dataset.drillId || "weights"}`;
        const modes = (root.dataset.modes || "weights").split(",").map((m) => m.trim()).filter((m) => GENERATORS[m]);
        const stats = load(storageKey);
        const title = modes.length > 1 ? "Drill: mixed sizing" : modes[0] === "weights" ? "Drill: size the weights" : "Drill: size the KV cache";

        root.innerHTML = `
            <h3>${title}</h3>
            <p class="drill-prompt"></p>
            <form class="drill-row" novalidate>
                <input type="text" inputmode="decimal" autocomplete="off" aria-label="Your answer">
                <button type="submit" class="primary">Check</button>
                <button type="button" class="drill-next">Next</button>
            </form>
            <p class="drill-feedback" aria-live="polite"></p>
            <p class="drill-stats"></p>`;

        const prompt = root.querySelector(".drill-prompt");
        const form = root.querySelector("form");
        const input = root.querySelector("input");
        const feedback = root.querySelector(".drill-feedback");
        const statsLine = root.querySelector(".drill-stats");
        let problem = null;
        let checked = false;

        function showStats() {
            statsLine.textContent = stats.tries
                ? `All-time: ${stats.right} right out of ${stats.tries}. Answers within 10% count.`
                : "Answers within 10% count.";
        }

        function newProblem() {
            problem = GENERATORS[pick(modes)]();
            prompt.innerHTML = problem.prompt;
            input.value = "";
            input.placeholder = problem.unit || "#";
            feedback.textContent = "";
            feedback.className = "drill-feedback";
            checked = false;
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (checked) { newProblem(); input.focus(); return; }
            const guess = parseFloat(input.value.replace(/,/g, ""));
            if (!Number.isFinite(guess)) { feedback.textContent = "Type a number."; return; }

            const right = Math.abs(guess - problem.answer) <= Math.max(problem.answer * 0.1, 0.05);
            stats.tries += 1;
            if (right) stats.right += 1;
            save(storageKey, stats);
            checked = true;

            feedback.className = `drill-feedback ${right ? "right" : "wrong"}`;
            feedback.textContent = `${right ? "Right" : "Not quite"}: ${problem.explain(guess)}`;
            showStats();
        });

        root.querySelector(".drill-next").addEventListener("click", () => { newProblem(); input.focus(); });

        newProblem();
        showStats();
    }
})();
