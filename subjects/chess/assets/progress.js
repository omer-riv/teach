// Curriculum progress: ticks off lessons whose quiz has been completed on this device.
//
// Markup: any element with data-quiz-ids="0001" (comma-separated quiz ids, as used by quiz.js).
// It gets class "done" when any of those quizzes has a saved score under
// "<subject>:quiz:<id>" in localStorage. Progress lives only in this browser.

(function () {
    const subject = document.body.dataset.subject || "course";
    let doneCount = 0;
    for (const item of document.querySelectorAll("[data-quiz-ids]")) {
        const ids = item.dataset.quizIds.split(",").map((id) => id.trim());
        const done = ids.some((id) => {
            try { return localStorage.getItem(`${subject}:quiz:${id}`) !== null; } catch { return false; }
        });
        if (done) { item.classList.add("done"); doneCount += 1; }
    }
    const summary = document.querySelector(".progress-summary");
    if (summary && doneCount > 0) {
        summary.textContent = `${doneCount} lesson${doneCount === 1 ? "" : "s"} completed on this device.`;
    }
})();
