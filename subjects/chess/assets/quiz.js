// Multiple-choice quiz component.
//
// Markup:
//   <div class="quiz widget" data-quiz-id="0001">
//     <fieldset class="q" data-answer="2">          <!-- zero-based index of the right option -->
//       <legend>Question?</legend>
//       <div class="options"><button>A</button><button>B</button><button>C</button></div>
//       <p class="why" hidden>Explanation shown after answering.</p>
//     </fieldset>
//     <p class="score" aria-live="polite"></p>
//   </div>
//
// The first tap on a question counts. Best score is saved in localStorage under
// "<subject>:quiz:<quiz-id>", where <subject> comes from <body data-subject>.

(function () {
    const subject = document.body.dataset.subject || "course";

    function readBest(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
    }
    function writeBest(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    }

    for (const quiz of document.querySelectorAll(".quiz")) {
        const storageKey = `${subject}:quiz:${quiz.dataset.quizId || "default"}`;
        const questions = [...quiz.querySelectorAll(".q")];
        const scoreLine = quiz.querySelector(".score");
        let answered = 0;
        let correct = 0;

        const best = readBest(storageKey);
        if (scoreLine && best) {
            scoreLine.textContent = `Your best so far: ${best.correct}/${best.total}.`;
        }

        for (const question of questions) {
            const answerIndex = Number(question.dataset.answer);
            const buttons = [...question.querySelectorAll(".options button")];
            const why = question.querySelector(".why");

            buttons.forEach((button, index) => {
                button.type = "button";
                button.addEventListener("click", () => {
                    if (question.dataset.done) return;
                    question.dataset.done = "1";
                    answered += 1;
                    if (index === answerIndex) correct += 1;
                    button.dataset.state = index === answerIndex ? "right" : "wrong";
                    buttons[answerIndex].dataset.state = "right";
                    if (why) {
                        why.hidden = false;
                        why.insertAdjacentHTML("afterbegin",
                            index === answerIndex ? "<strong>Right.</strong> " : "<strong>Not quite.</strong> ");
                    }
                    if (answered === questions.length && scoreLine) {
                        const previous = readBest(storageKey);
                        if (!previous || correct > previous.correct) {
                            writeBest(storageKey, { correct, total: questions.length, at: new Date().toISOString() });
                        }
                        scoreLine.textContent = `You got ${correct} of ${questions.length}.` +
                            (correct === questions.length ? " Clean sweep." : " Reload the page to try again.");
                    }
                });
            });
        }
    }
})();
