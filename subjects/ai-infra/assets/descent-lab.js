// Gradient-descent lab: train a one-knob model, fare = w × km, by hand or by stepping downhill.
//
// Markup:
//   <div class="descent-lab widget" data-lab-mode="slider"></div>   <!-- find the best w by dragging -->
//   <div class="descent-lab widget" data-lab-mode="step"></div>     <!-- gradient steps, pick a learning rate -->
//
// Loss is mean squared error over five fixed data points. Everything is computed live, so the
// numbers the learner sees are the real loss and gradient for the current w.

(function () {
    const KM = [1, 2, 3, 4, 5];
    const FARE = [2.2, 3.9, 6.1, 8.0, 9.8];
    const LEARNING_RATES = [0.005, 0.04, 0.1];
    const START_W = 0.5;

    const loss = (w) => KM.reduce((sum, x, i) => sum + (w * x - FARE[i]) ** 2, 0) / KM.length;
    const gradient = (w) => KM.reduce((sum, x, i) => sum + 2 * x * (w * x - FARE[i]), 0) / KM.length;
    const fmt = (n, digits = 2) => {
        if (!Number.isFinite(n)) return "∞";
        if (Math.abs(n) >= 1e5) return n.toExponential(1);
        return n.toFixed(digits);
    };

    // Chart geometry (viewBox units).
    const W = 320, H = 200, PAD = 30, X_MAX = 5.5, Y_MAX = 14;
    const sx = (x) => PAD + (x / X_MAX) * (W - PAD - 10);
    const sy = (y) => H - PAD - (y / Y_MAX) * (H - PAD - 10);

    function chartSvg() {
        const dots = KM.map((x, i) => `<circle cx="${sx(x)}" cy="${sy(FARE[i])}" r="5" class="lab-dot"/>`).join("");
        const xTicks = [1, 2, 3, 4, 5].map((x) =>
            `<text x="${sx(x)}" y="${H - PAD + 16}" text-anchor="middle" class="lab-tick">${x}</text>`).join("");
        const yTicks = [0, 5, 10].map((y) =>
            `<text x="${PAD - 6}" y="${sy(y) + 4}" text-anchor="end" class="lab-tick">${y}</text>`).join("");
        return `
            <svg viewBox="0 0 ${W} ${H}" class="lab-chart" role="img" aria-label="Taxi fares against distance, with the model's prediction line">
                <line x1="${PAD}" y1="${H - PAD}" x2="${W - 10}" y2="${H - PAD}" class="lab-axis"/>
                <line x1="${PAD}" y1="${H - PAD}" x2="${PAD}" y2="10" class="lab-axis"/>
                ${xTicks}${yTicks}
                <text x="${W - 10}" y="${H - 4}" text-anchor="end" class="lab-tick">km</text>
                <text x="${PAD + 4}" y="18" class="lab-tick">fare $</text>
                <g class="lab-errors"></g>
                <line class="lab-line"/>
                ${dots}
            </svg>`;
    }

    function drawModel(root, w) {
        const line = root.querySelector(".lab-line");
        const xEnd = Math.min(X_MAX, w > 0 ? Y_MAX / w : X_MAX);
        const yEnd = Math.max(-2, Math.min(Y_MAX, w * xEnd));
        line.setAttribute("x1", sx(0)); line.setAttribute("y1", sy(0));
        line.setAttribute("x2", sx(xEnd)); line.setAttribute("y2", sy(yEnd));
        root.querySelector(".lab-errors").innerHTML = KM.map((x, i) => {
            const predicted = Math.max(-1, Math.min(Y_MAX, w * x));
            return `<line x1="${sx(x)}" y1="${sy(FARE[i])}" x2="${sx(x)}" y2="${sy(predicted)}" class="lab-error"/>`;
        }).join("");
    }

    function readout(w) {
        const g = gradient(w);
        return `<div><span class="lab-label">knob w</span><span class="lab-value">${fmt(w)}</span></div>` +
            `<div><span class="lab-label">loss</span><span class="lab-value">${fmt(loss(w))}</span></div>` +
            `<div><span class="lab-label">gradient</span><span class="lab-value">${fmt(g)}</span></div>`;
    }

    function setupSlider(root) {
        root.innerHTML = `
            <h3>Lab 1: turn the knob</h3>
            <p>Drag to change <code>w</code>. Red lines are the errors. Get the loss as low as you can.</p>
            ${chartSvg()}
            <div class="lab-readout"></div>
            <input type="range" min="0" max="4" step="0.01" value="${START_W}" class="lab-slider" aria-label="Knob w">
            <p class="lab-note" aria-live="polite"></p>`;
        const slider = root.querySelector(".lab-slider");
        const out = root.querySelector(".lab-readout");
        const note = root.querySelector(".lab-note");
        let best = Infinity;
        const update = () => {
            const w = Number(slider.value);
            drawModel(root, w);
            out.innerHTML = readout(w);
            best = Math.min(best, loss(w));
            note.textContent = best < 0.04
                ? `Lowest loss so far: ${fmt(best, 3)}. That's about as low as it goes: no single w fits every point exactly.`
                : `Lowest loss so far: ${fmt(best, 3)}.`;
        };
        slider.addEventListener("input", update);
        update();
    }

    function setupStepper(root) {
        root.innerHTML = `
            <h3>Lab 2: step downhill</h3>
            <p>Each step does <code>w ← w − learning rate × gradient</code>. Pick a learning rate, then tap <em>Step</em> a few times.</p>
            <div class="lab-rates" role="group" aria-label="Learning rate">
                ${LEARNING_RATES.map((lr) => `<button type="button" data-lr="${lr}">${lr}</button>`).join("")}
            </div>
            ${chartSvg()}
            <div class="lab-readout"></div>
            <div class="drill-row">
                <button type="button" class="primary lab-step">Step</button>
                <button type="button" class="lab-reset">Reset</button>
            </div>
            <ol class="lab-log" aria-live="polite"></ol>`;
        const out = root.querySelector(".lab-readout");
        const log = root.querySelector(".lab-log");
        const rateButtons = [...root.querySelectorAll(".lab-rates button")];
        let lr = 0.04;
        let w = START_W;
        let steps = 0;

        const render = () => {
            drawModel(root, w);
            out.innerHTML = readout(w);
            rateButtons.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.lr) === lr)));
        };
        const reset = () => { w = START_W; steps = 0; log.innerHTML = ""; render(); };

        rateButtons.forEach((b) => b.addEventListener("click", () => { lr = Number(b.dataset.lr); reset(); }));
        root.querySelector(".lab-reset").addEventListener("click", reset);
        root.querySelector(".lab-step").addEventListener("click", () => {
            if (!Number.isFinite(w) || Math.abs(w) > 1e6) return;
            const g = gradient(w);
            const before = w;
            w = w - lr * g;
            steps += 1;
            const item = document.createElement("li");
            item.textContent = `w ${fmt(before)} − ${lr} × ${fmt(g)} = ${fmt(w)} → loss ${fmt(loss(w))}`;
            log.prepend(item);
            while (log.children.length > 6) log.lastElementChild.remove();
            render();
        });
        render();
    }

    for (const root of document.querySelectorAll(".descent-lab")) {
        (root.dataset.labMode === "step" ? setupStepper : setupSlider)(root);
    }
})();
