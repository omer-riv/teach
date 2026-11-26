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

(function () {
    const subject = document.body.dataset.subject || "course";
    const FILES = "abcdefgh";
    const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    // Filled glyphs for both colours (CSS colours them); U+FE0E keeps iOS from drawing emoji.
    const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
    const NAME = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };

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
    function makeBoard(container, onTap) {
        const grid = document.createElement("div");
        grid.className = "board";
        grid.setAttribute("role", "grid");
        const squares = {};
        for (let rank = 8; rank >= 1; rank -= 1) {
            for (let f = 0; f < 8; f += 1) {
                const sq = FILES[f] + rank;
                const cell = document.createElement("button");
                cell.type = "button";
                cell.className = "sq " + ((f + rank) % 2 === 0 ? "light" : "dark");
                cell.dataset.sq = sq;
                if (f === 0) cell.insertAdjacentHTML("beforeend", `<span class="coord rank">${rank}</span>`);
                if (rank === 1) cell.insertAdjacentHTML("beforeend", `<span class="coord file">${FILES[f]}</span>`);
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

        return function render(board, marks = {}) {
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
        const render = makeBoard(holder, null);
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
            render(board, { last: current ? [current.dataset.move.slice(0, 2), current.dataset.move.slice(2, 4)] : null });
            notes.forEach((li, i) => { li.hidden = i !== at - 1; });
            status.innerHTML = current ? `<strong>${current.dataset.san}</strong> · move ${at} of ${notes.length}` : intro;
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
            let msg = `${SETUP[uci].san}: ${SETUP[uci].why}`;
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
            feedback.textContent = `${msg} Black replies ${san}.`;
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
})();
