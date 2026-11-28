// Chess board components. No rules engine: positions change only through the moves a
// component scripts, written from-to ("e2e4"). Castling ("e1g1") moves the rook too.
//
// 1. Walkthrough: step through a line, one note per move.
//   <div class="walk widget">
//     <ol class="walk-notes">
//       <li data-move="e2e4" data-san="1. e4">Note shown after this move.</li> …
//     </ol>
//   </div>
//
// 2. Setup trainer: the learner plays White's Italian setup from memory against
//    scripted Black replies. See setupRules below for which White moves count.
//   <div class="trainer widget" data-trainer-id="0001">
//     <ul class="trainer-lines" hidden>
//       <li data-name="…" data-black="e7e5 b8c6 f8c5" data-san="e5 Nc6 Bc5"></li> …
//     </ul>
//   </div>
//   Stats are saved in localStorage under "<subject>:trainer:<id>".
//
// 0. Diagram: a still picture of a position, with optional arrows and circled squares.
//   <figure class="diagram" data-moves="e2e4 e7e5" data-arrows="d1h5 h5f7" data-rings="f7"
//           data-flip>  <figcaption>Caption.</figcaption></figure>
//   Walkthrough notes take data-arrows and data-rings too.
//
// 4. Square finder: <div class="square-finder widget" data-finder-id="squares"></div>
//   Names a square; the learner taps it. Best streak saved under "<subject>:finder:<id>".
//
// 3. Line drill: the learner plays one side of a scripted line from memory.
//   <div class="line-drill widget" data-drill-id="0002" data-side="black">
//     <ul class="drill-lines" hidden>
//       <li data-name="Scholar's mate" data-moves="e2e4 e7e5 f1c4 b8c6/d7d6 …" data-san="e4 e5 Bc4 Nc6/d6 …">
//         <span data-on="g7g6" data-kind="why">Shown after this right move.</span>
//         <span data-on="g8f6" data-kind="trap">Shown when the learner tries this wrong move.</span>
//         <span data-on="g7g6@4" data-kind="trap">Only when tried as ply 4 (1-based half-move).</span>
//         <span data-on="d7d6" data-kind="ok">A good move, but not this drill's: shown, not counted.</span>
//       </li>
//     </ul>
//   </div>
//   Moves alternate White, Black. "a/b" lists moves that are all accepted (with matching
//   "Nc6/d6" in data-san). The board is shown from the learner's side.
//   Stats are saved in localStorage under "<subject>:drill:<id>".

(function () {
    const subject = document.body.dataset.subject || "course";
    const FILES = "abcdefgh";
    const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    // Filled glyphs for both colours (CSS colours them); U+FE0E keeps iOS from drawing emoji.
    const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
    const NAME = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
    const LETTER = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight" };

    // "Nf3" -> "knight to f3", "Qxf7#" -> "queen takes on f7, checkmate", "O-O" -> "castles".
    function spell(san) {
        const clean = san.replace(/^\d+(\.\.\.|\.|…)\s*/, "").replace(/[?!]+$/, "");
        if (/^O-O-O/.test(clean)) return "castles on the queen's side";
        if (/^O-O/.test(clean)) return "castles on the king's side";
        const m = clean.match(/^([KQRBN])?([a-h])?x?([a-h][1-8])([+#])?$/);
        if (!m) return "";
        const piece = m[1] ? LETTER[m[1]] : "pawn";
        const takes = clean.includes("x");
        let text = `${piece} ${takes ? "takes on" : "to"} ${m[3]}`;
        if (m[4] === "+") text += ", check";
        if (m[4] === "#") text += ", checkmate";
        return text;
    }
    function withSpell(san) {
        const words = spell(san);
        return words ? `${san} <span class="spell">(${words})</span>` : san;
    }

    function parse(fen) {
        const board = {};
        fen.split("/").forEach((row, r) => {
            let file = 0;
            for (const ch of row) {
                if (/\d/.test(ch)) { file += Number(ch); continue; }
                board[FILES[file] + (8 - r)] = ch;
                file += 1;
            }
        });
        return board;
    }

    function applyMove(board, uci) {
        const from = uci.slice(0, 2), to = uci.slice(2, 4);
        const piece = board[from];
        delete board[from];
        board[to] = piece;
        if (piece === "K" && from === "e1" && to === "g1") { board.f1 = board.h1; delete board.h1; }
        if (piece === "K" && from === "e1" && to === "c1") { board.d1 = board.a1; delete board.a1; }
        if (piece === "k" && from === "e8" && to === "g8") { board.f8 = board.h8; delete board.h8; }
        if (piece === "k" && from === "e8" && to === "c8") { board.d8 = board.a8; delete board.a8; }
    }

    function readJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
    function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } }

    // Renders 64 square buttons into `container`; White at the bottom.
    // With flipped = true, Black is at the bottom.
    function makeBoard(container, onTap, flipped = false) {
        const grid = document.createElement("div");
        grid.className = "board";
        grid.setAttribute("role", "grid");
        const squares = {};
        for (let row = 0; row < 8; row += 1) {
            for (let col = 0; col < 8; col += 1) {
                const rank = flipped ? row + 1 : 8 - row;
                const f = flipped ? 7 - col : col;
                const sq = FILES[f] + rank;
                const cell = document.createElement("button");
                cell.type = "button";
                cell.className = "sq " + ((f + rank) % 2 === 0 ? "light" : "dark");
                cell.dataset.sq = sq;
                if (col === 0) cell.insertAdjacentHTML("beforeend", `<span class="coord rank">${rank}</span>`);
                if (row === 7) cell.insertAdjacentHTML("beforeend", `<span class="coord file">${FILES[f]}</span>`);
                const piece = document.createElement("span");
                piece.className = "piece";
                cell.appendChild(piece);
                if (onTap) cell.addEventListener("click", () => onTap(sq));
                else cell.tabIndex = -1;
                squares[sq] = { cell, piece };
                grid.appendChild(cell);
            }
        }
        container.appendChild(grid);
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("class", "arrows");
        svg.setAttribute("viewBox", "0 0 8 8");
        svg.setAttribute("aria-hidden", "true");
        const markerId = "ah" + Math.random().toString(36).slice(2, 8);
        svg.innerHTML = `<defs><marker id="${markerId}" viewBox="0 0 10 10" refX="5" refY="5"
            markerWidth="2.6" markerHeight="2.6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" class="arrow-head"/></marker></defs><g></g>`;
        grid.appendChild(svg);
        const layer = svg.querySelector("g");
        const centre = (sq) => {
            const f = FILES.indexOf(sq[0]), rank = Number(sq[1]);
            return flipped ? [7 - f + 0.5, rank - 1 + 0.5] : [f + 0.5, 8 - rank + 0.5];
        };

        return function render(board, marks = {}) {
            layer.innerHTML = "";
            for (const sq of marks.rings || []) {
                const [x, y] = centre(sq);
                const c = document.createElementNS(NS, "circle");
                c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 0.44);
                c.setAttribute("class", "ring");
                layer.appendChild(c);
            }
            for (const a of marks.arrows || []) {
                const [x1, y1] = centre(a.slice(0, 2)), [x2, y2] = centre(a.slice(2, 4));
                const len = Math.hypot(x2 - x1, y2 - y1);
                const k = (len - 0.35) / len; // stop short of the centre so the head sits on the square
                const l = document.createElementNS(NS, "line");
                l.setAttribute("x1", x1); l.setAttribute("y1", y1);
                l.setAttribute("x2", x1 + (x2 - x1) * k); l.setAttribute("y2", y1 + (y2 - y1) * k);
                l.setAttribute("class", "arrow");
                l.setAttribute("marker-end", `url(#${markerId})`);
                layer.appendChild(l);
            }
            for (const [sq, { cell, piece }] of Object.entries(squares)) {
                const p = board[sq];
                piece.textContent = p ? GLYPH[p.toLowerCase()] + "︎" : "";
                piece.className = "piece " + (p ? (p === p.toUpperCase() ? "w" : "b") : "");
                cell.setAttribute("aria-label", sq + (p ? `, ${p === p.toUpperCase() ? "white" : "black"} ${NAME[p.toLowerCase()]}` : ""));
                cell.classList.toggle("last", !!marks.last && marks.last.includes(sq));
                cell.classList.toggle("selected", marks.selected === sq);
                cell.classList.toggle("hint", marks.hint === sq);
            }
        };
    }

    // ---- Walkthrough ----
    for (const walk of document.querySelectorAll(".walk")) {
        const notes = [...walk.querySelectorAll(".walk-notes li")];
        notes.forEach((li) => { li.hidden = true; });
        const intro = walk.dataset.intro || "Tap Next to play the first move.";
        const holder = document.createElement("div");
        walk.prepend(holder);
        const render = makeBoard(holder, null, walk.hasAttribute("data-flip"));
        const status = document.createElement("p");
        status.className = "walk-status";
        status.setAttribute("aria-live", "polite");
        holder.after(status);
        const controls = document.createElement("div");
        controls.className = "walk-controls";
        controls.innerHTML = `<button type="button" data-act="back">Back</button>
            <button type="button" class="primary" data-act="next">Next</button>
            <button type="button" data-act="reset">Restart</button>`;
        walk.appendChild(controls);
        let at = 0; // number of moves played

        function show() {
            const board = parse(START);
            notes.slice(0, at).forEach((li) => applyMove(board, li.dataset.move));
            const current = notes[at - 1];
            const list = (v) => (v ? v.trim().split(/\s+/) : []);
            render(board, {
                last: current ? [current.dataset.move.slice(0, 2), current.dataset.move.slice(2, 4)] : null,
                arrows: list(current?.dataset.arrows),
                rings: list(current?.dataset.rings),
            });
            notes.forEach((li, i) => { li.hidden = i !== at - 1; });
            status.innerHTML = current
                ? `<strong>${current.dataset.san}</strong> ${spell(current.dataset.san) ? `<span class="spell">${spell(current.dataset.san)}</span>` : ""}<br><span class="walk-count">move ${at} of ${notes.length}</span>`
                : intro;
            controls.querySelector('[data-act="back"]').disabled = at === 0;
            controls.querySelector('[data-act="next"]').disabled = at === notes.length;
        }
        controls.addEventListener("click", (e) => {
            const act = e.target.closest("button")?.dataset.act;
            if (act === "next" && at < notes.length) at += 1;
            if (act === "back" && at > 0) at -= 1;
            if (act === "reset") at = 0;
            show();
        });
        show();
    }

    // ---- Setup trainer ----
    // White's setup: e4, Nf3, Bc4 in that order, then c3, d3 and O-O in any order,
    // except that d3 comes first whenever a black knight on f6 attacks the e4 pawn.
    const SETUP = {
        e2e4: { san: "e4", why: "a pawn in the centre, opening lines for your bishop and queen." },
        g1f3: { san: "Nf3", why: "a knight out, hitting the e5 pawn." },
        f1c4: { san: "Bc4", why: "the bishop aims at f7, the weak square next to Black's king." },
        c2c3: { san: "c3", why: "prepares d4 later, and gives the bishop a hiding square on c2." },
        d2d3: { san: "d3", why: "the e4 pawn is now defended." },
        e1g1: { san: "O-O", why: "your king is tucked away and the rook joins the game." },
    };
    const ORDER = ["e2e4", "g1f3", "f1c4", "c2c3", "d2d3", "e1g1"];

    function allowedMoves(board, played) {
        const remaining = ORDER.filter((m) => !played.includes(m));
        if (played.length < 3) return [remaining[0]];
        const e4Attacked = board.f6 === "n" && board.d3 !== "P";
        if (e4Attacked && remaining.includes("d2d3")) return ["d2d3"];
        return remaining;
    }

    for (const trainer of document.querySelectorAll(".trainer")) {
        const storageKey = `${subject}:trainer:${trainer.dataset.trainerId || "default"}`;
        const lines = [...trainer.querySelectorAll(".trainer-lines li")].map((li) => ({
            name: li.dataset.name,
            black: li.dataset.black.split(" "),
            san: li.dataset.san.split(" "),
        }));
        const holder = document.createElement("div");
        trainer.appendChild(holder);
        const render = makeBoard(holder, tap);
        const feedback = document.createElement("p");
        feedback.className = "trainer-feedback";
        feedback.setAttribute("aria-live", "polite");
        const moves = document.createElement("p");
        moves.className = "trainer-moves mono";
        const controls = document.createElement("div");
        controls.className = "walk-controls";
        controls.innerHTML = `<button type="button" class="primary" data-act="new">New game</button>`;
        const stats = document.createElement("p");
        stats.className = "drill-stats";
        holder.after(feedback, moves, controls, stats);

        let board, line, played, blackIndex, selected, misses, mistakes, last, hint, finished, sanLog;
        let lineCursor = Math.floor(Math.random() * lines.length);

        function showStats() {
            const s = readJSON(storageKey);
            stats.textContent = s ? `Games finished: ${s.runs} · without a mistake: ${s.clean}` : "";
        }
        function draw() {
            render(board, { last, selected, hint });
            moves.textContent = sanLog.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}. ` : "") + s).join(" ");
        }
        function start() {
            line = lines[lineCursor % lines.length];
            lineCursor += 1 + Math.floor(Math.random() * (lines.length - 1));
            board = parse(START);
            played = []; blackIndex = 0; selected = null; misses = 0; mistakes = 0;
            last = null; hint = null; finished = false; sanLog = [];
            feedback.className = "trainer-feedback";
            feedback.textContent = `${line.name}. You're White: play your first move.`;
            draw();
        }
        function blackReplies() {
            const uci = line.black[blackIndex];
            const san = line.san[blackIndex];
            blackIndex += 1;
            applyMove(board, uci);
            sanLog.push(san);
            last = [uci.slice(0, 2), uci.slice(2, 4)];
            return san;
        }
        function attempt(uci) {
            const allowed = allowedMoves(board, played);
            if (!allowed.includes(uci)) {
                misses += 1; mistakes += 1;
                const e4Attacked = board.f6 === "n" && board.d3 !== "P";
                let msg = played.length < 3 && SETUP[uci]
                    ? "Right idea, wrong order: the first three moves go e4, Nf3, Bc4."
                    : e4Attacked && SETUP[uci]
                        ? "Careful: the knight on f6 is attacking your e4 pawn. Defend it first."
                        : "That move isn't part of the setup.";
                if (misses >= 2) {
                    hint = allowed[0].slice(0, 2);
                    msg += " The highlighted piece moves next.";
                }
                feedback.className = "trainer-feedback wrong";
                feedback.textContent = msg;
                selected = null;
                draw();
                return;
            }
            applyMove(board, uci);
            played.push(uci);
            sanLog.push(SETUP[uci].san);
            selected = null; hint = null; misses = 0;
            last = [uci.slice(0, 2), uci.slice(2, 4)];
            let msg = `${withSpell(SETUP[uci].san)}: ${SETUP[uci].why}`;
            if (played.length === ORDER.length) {
                finished = true;
                const s = readJSON(storageKey) || { runs: 0, clean: 0 };
                s.runs += 1;
                if (mistakes === 0) s.clean += 1;
                writeJSON(storageKey, s);
                feedback.className = "trainer-feedback right";
                feedback.textContent = `Setup complete${mistakes === 0 ? ", with no mistakes" : ` (${mistakes} slip${mistakes === 1 ? "" : "s"})`}. Tap New game for another line.`;
                draw();
                showStats();
                return;
            }
            const san = blackReplies();
            feedback.className = "trainer-feedback right";
            feedback.innerHTML = `${msg} Black replies <strong>${withSpell(san)}</strong>.`;
            draw();
        }
        function tap(sq) {
            if (finished) return;
            const p = board[sq];
            const isWhite = p && p === p.toUpperCase();
            if (selected && selected === "e1" && sq === "h1") { attempt("e1g1"); return; } // king then rook = castle
            if (isWhite) { selected = selected === sq ? null : sq; draw(); return; }
            if (selected) attempt(selected + sq);
        }
        controls.addEventListener("click", start);
        start();
        showStats();
    }
    // ---- Line drill ----
    for (const drill of document.querySelectorAll(".line-drill")) {
        const storageKey = `${subject}:drill:${drill.dataset.drillId || "default"}`;
        const side = drill.dataset.side === "black" ? 1 : 0; // index parity of the learner's moves
        const lines = [...drill.querySelectorAll(".drill-lines li")].map((li) => {
            const notes = {};
            for (const span of li.querySelectorAll("[data-on]")) {
                notes[`${span.dataset.kind}:${span.dataset.on}`] = span.innerHTML;
            }
            return {
                name: li.dataset.name,
                moves: li.dataset.moves.trim().split(/\s+/).map((t) => t.split("/")),
                san: li.dataset.san.trim().split(/\s+/).map((t) => t.split("/")),
                notes,
            };
        });
        const holder = document.createElement("div");
        drill.appendChild(holder);
        const render = makeBoard(holder, tap, side === 1);
        const feedback = document.createElement("p");
        feedback.className = "trainer-feedback";
        feedback.setAttribute("aria-live", "polite");
        const log = document.createElement("p");
        log.className = "trainer-moves mono";
        const controls = document.createElement("div");
        controls.className = "walk-controls";
        controls.innerHTML = `<button type="button" class="primary">New game</button>`;
        const stats = document.createElement("p");
        stats.className = "drill-stats";
        holder.after(feedback, log, controls, stats);

        let board, line, ply, selected, misses, mistakes, last, hint, finished, sanLog;
        let cursor = Math.floor(Math.random() * lines.length);
        const mine = (p) => p && (side === 0 ? p === p.toUpperCase() : p === p.toLowerCase());

        function showStats() {
            const s = readJSON(storageKey);
            stats.textContent = s ? `Games finished: ${s.runs} · without a mistake: ${s.clean}` : "";
        }
        function draw() {
            render(board, { last, selected, hint });
            log.textContent = sanLog.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ` : "") + m).join(" ");
        }
        function play(uci, san) {
            applyMove(board, uci);
            sanLog.push(san);
            last = [uci.slice(0, 2), uci.slice(2, 4)];
            ply += 1;
        }
        function opponentMoves() {
            const san = line.san[ply][0];
            play(line.moves[ply][0], san);
            return san;
        }
        function finish(prefix) {
            finished = true;
            const s = readJSON(storageKey) || { runs: 0, clean: 0 };
            s.runs += 1;
            if (mistakes === 0) s.clean += 1;
            writeJSON(storageKey, s);
            feedback.className = "trainer-feedback right";
            feedback.innerHTML = `${prefix} <strong>Line complete${mistakes === 0 ? ", no mistakes" : ` (${mistakes} slip${mistakes === 1 ? "" : "s"})`}.</strong> Tap New game for another.`;
            showStats();
        }
        function start() {
            line = lines[cursor % lines.length];
            cursor += 1 + Math.floor(Math.random() * (lines.length - 1));
            board = parse(START);
            ply = 0; selected = null; misses = 0; mistakes = 0;
            last = null; hint = null; finished = false; sanLog = [];
            let intro = `${line.name}. You're ${side ? "Black" : "White"}.`;
            if (side === 1) intro += ` White plays ${withSpell(opponentMoves())}. Your move.`;
            else intro += " Your move.";
            feedback.className = "trainer-feedback";
            feedback.innerHTML = intro;
            draw();
        }
        function attempt(uci) {
            const options = line.moves[ply];
            const index = options.indexOf(uci);
            const okNote = line.notes[`ok:${uci}@${ply + 1}`] || line.notes[`ok:${uci}`];
            if (index < 0 && okNote) {
                // A fine move, just not the one this drill practises: no penalty.
                feedback.className = "trainer-feedback";
                feedback.innerHTML = okNote;
                selected = null;
                draw();
                return;
            }
            if (index < 0) {
                misses += 1; mistakes += 1;
                let msg = line.notes[`trap:${uci}@${ply + 1}`] || line.notes[`trap:${uci}`]
                    || "Not that one. What is your opponent threatening?";
                if (misses >= 2) { hint = options[0].slice(0, 2); msg += " The highlighted piece moves next."; }
                feedback.className = "trainer-feedback wrong";
                feedback.innerHTML = msg;
                selected = null;
                draw();
                return;
            }
            const san = line.san[ply][index];
            play(uci, san);
            selected = null; hint = null; misses = 0;
            const why = line.notes[`why:${uci}`] || "";
            if (ply >= line.moves.length) { finish(`${withSpell(san)}: ${why}`); draw(); return; }
            const reply = opponentMoves();
            feedback.className = "trainer-feedback right";
            feedback.innerHTML = `${withSpell(san)}: ${why} ${side ? "White" : "Black"} plays <strong>${withSpell(reply)}</strong>.`;
            if (ply >= line.moves.length) finish(feedback.innerHTML);
            draw();
        }
        function tap(sq) {
            if (finished) return;
            const p = board[sq];
            if (selected && board[selected] && board[selected].toLowerCase() === "k" && (sq === "h1" || sq === "h8")) {
                attempt(selected + "g" + sq[1]); return; // king then rook = castle short
            }
            if (mine(p)) { selected = selected === sq ? null : sq; draw(); return; }
            if (selected) attempt(selected + sq);
        }
        controls.addEventListener("click", start);
        start();
        showStats();
    }
    // ---- Diagrams ----
    for (const fig of document.querySelectorAll(".diagram")) {
        const list = (v) => (v ? v.trim().split(/\s+/) : []);
        const board = parse(fig.dataset.fen || START);
        const moves = list(fig.dataset.moves);
        moves.forEach((m) => applyMove(board, m));
        const holder = document.createElement("div");
        fig.prepend(holder);
        const render = makeBoard(holder, null, fig.hasAttribute("data-flip"));
        const lastMove = moves[moves.length - 1];
        render(board, {
            last: fig.hasAttribute("data-no-last") || !lastMove ? null : [lastMove.slice(0, 2), lastMove.slice(2, 4)],
            arrows: list(fig.dataset.arrows),
            rings: list(fig.dataset.rings),
        });
    }

    // ---- Square finder ----
    for (const finder of document.querySelectorAll(".square-finder")) {
        const storageKey = `${subject}:finder:${finder.dataset.finderId || "default"}`;
        let flipped = false, target = null, streak = 0, best = (readJSON(storageKey) || {}).best || 0, missed = false;
        const top = document.createElement("div");
        top.className = "finder-top";
        top.innerHTML = `<p class="finder-prompt" aria-live="polite"></p>
            <button type="button" class="finder-flip" aria-pressed="false">View as Black</button>`;
        finder.appendChild(top);
        const holder = document.createElement("div");
        finder.appendChild(holder);
        const feedback = document.createElement("p");
        feedback.className = "trainer-feedback";
        const stats = document.createElement("p");
        stats.className = "drill-stats";
        finder.append(feedback, stats);
        const prompt = top.querySelector(".finder-prompt");
        const flipButton = top.querySelector(".finder-flip");
        let render;

        function build() {
            holder.innerHTML = "";
            render = makeBoard(holder, tap, flipped);
            render({});
        }
        function next() {
            let sq;
            do { sq = FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8)); } while (sq === target);
            target = sq; missed = false;
            prompt.innerHTML = `Tap <strong>${target}</strong>`;
        }
        function showStats() { stats.textContent = `Streak: ${streak} · best: ${best}`; }
        function tap(sq) {
            if (sq === target) {
                if (!missed) {
                    streak += 1;
                    if (streak > best) { best = streak; writeJSON(storageKey, { best }); }
                }
                feedback.className = "trainer-feedback right";
                feedback.textContent = `Yes, ${sq}: column ${sq[0]}, row ${sq[1]}.`;
                render({}, { last: [sq] });
                next();
            } else {
                missed = true; streak = 0;
                feedback.className = "trainer-feedback wrong";
                feedback.textContent = `That's ${sq}. Find column ${target[0]} along the bottom edge and row ${target[1]} along the left edge. It's circled.`;
                render({}, { rings: [target], hint: null });
            }
            showStats();
        }
        flipButton.addEventListener("click", () => {
            flipped = !flipped;
            flipButton.setAttribute("aria-pressed", String(flipped));
            flipButton.textContent = flipped ? "View as White" : "View as Black";
            build();
        });
        build();
        next();
        showStats();
    }
})();
