// Weight-memory sizing drill: endless random "how many GB are the weights?" problems.
//
// Markup:
//   <div class="sizing-drill widget" data-drill-id="weights"></div>
//
// Answers within 10% count. Running totals are saved in localStorage under
// "<subject>:drill:<drill-id>", where <subject> comes from <body data-subject>.

(function () {
    const subject = document.body.dataset.subject || "course";

    const MODEL_SIZES_B = [1, 3, 7, 8, 13, 32, 70, 123, 405];
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

    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

    function load(key) {
        try { return JSON.parse(localStorage.getItem(key)) || { right: 0, tries: 0 }; }
        catch { return { right: 0, tries: 0 }; }
    }
    function save(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    }

    for (const root of document.querySelectorAll(".sizing-drill")) {
        const storageKey = `${subject}:drill:${root.dataset.drillId || "weights"}`;
        const stats = load(storageKey);

        root.innerHTML = `
            <h3>Drill: size the weights</h3>
            <p class="drill-prompt"></p>
            <form class="drill-row" novalidate>
                <input type="text" inputmode="decimal" autocomplete="off" aria-label="Answer in GB" placeholder="GB">
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
                ? `All-time: ${stats.right} right out of ${stats.tries}.`
                : "Answers within 10% count.";
        }

        function newProblem() {
            const sizeB = pick(MODEL_SIZES_B);
            const precision = pick(PRECISIONS);
            const gpu = pick(GPUS);
            problem = { sizeB, precision, gpu, answerGb: sizeB * precision.bytes };
            prompt.innerHTML = `A <strong>${sizeB}B</strong> model stored in <strong>${precision.name}</strong>. ` +
                `How many GB do its weights take?`;
            input.value = "";
            feedback.textContent = "";
            feedback.className = "drill-feedback";
            checked = false;
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (checked) { newProblem(); input.focus(); return; }
            const guess = parseFloat(input.value.replace(",", "."));
            if (!Number.isFinite(guess)) { feedback.textContent = "Type a number of GB."; return; }

            const { sizeB, precision, gpu, answerGb } = problem;
            const right = Math.abs(guess - answerGb) <= answerGb * 0.1;
            const gpusNeeded = Math.ceil(answerGb / gpu.gb);
            const fit = gpusNeeded === 1
                ? `It fits on one ${gpu.name} (${gpu.gb} GB), leaving ${fmt(gpu.gb - answerGb)} GB for the KV cache.`
                : `That's more than one ${gpu.name} (${gpu.gb} GB): at least ${gpusNeeded} just for the weights.`;

            stats.tries += 1;
            if (right) stats.right += 1;
            save(storageKey, stats);
            checked = true;

            feedback.className = `drill-feedback ${right ? "right" : "wrong"}`;
            feedback.textContent = `${right ? "Right" : "Not quite"}: ${sizeB} billion × ${precision.bytes} bytes = ` +
                `${fmt(answerGb)} GB. ${fit}`;
            showStats();
        });

        root.querySelector(".drill-next").addEventListener("click", () => { newProblem(); input.focus(); });

        newProblem();
        showStats();
    }
})();
