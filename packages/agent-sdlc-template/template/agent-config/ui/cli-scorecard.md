# CLI Scorecard

A rubric for evaluating the usability health of a single CLI command, script, or terminal-style surface against [`cli-standards.md`](cli-standards.md) and [`ui-doctrine.md`](ui-doctrine.md). Score each criterion 0–10. Total is out of 100.

| Criterion | 0–10 | Notes |
| :--- | :--- | :--- |
| **First byte** | | Does *something* meaningful appear on stdout/stderr within ~200 ms of invocation? Does it identify the command and what it's about to do? |
| **Progress on long work** | | Any step longer than ~2 s shows real progress — step list, counter, percent (only if real), streaming log, or labelled spinner. Never fake. |
| **Naming the long step** | | When one sub-step dominates wall time, the command says which step and roughly how long it usually takes. The user can step away with confidence. |
| **Outcome line** | | Every run ends with exactly one unambiguous outcome line — success/failure, what changed, next step where relevant. Outcome is the last thing on screen. |
| **Error quality** | | Errors say *what failed*, *why in actionable terms*, and *what to do next*. No bare stack traces. No "An error occurred." Reservoir-refilling. |
| **TTY-awareness** | | Non-TTY mode drops spinners and colour, switches to line-buffered structured progress, flushes after every line. Honours `NO_COLOR` / `--no-color`. |
| **Signal levels** | | Default, `--quiet`, `--verbose` are all honest about who's watching. CI / scripts can opt into `--quiet`; humans never need it. `LOG_LEVEL` works where it's the convention. |
| **No fake progress** | | Spinners reflect real work. No "Done" before done. No invented percent. No spinner outliving the process on error paths. |
| **Word economy** | | Output is half what it could be, then half again. Banner chrome doesn't bury the outcome. Warnings are actionable. Logs are scannable. |
| **Non-interactive safety** | | Doesn't ask interactive questions in non-interactive modes (CI, `--quiet`, non-TTY). Provides flags / env for every question; refuses to start with a clear missing-flag message when a required answer wasn't supplied. |

**Total Score:** ___ / 100

## How to use this scorecard

- Score one surface at a time. A repo with five scripts gets five scores. Don't average.
- Pair the score with a debrief that lists the *three most serious* problems observed. Severity-ranked findings matter more than the headline number.
- Re-score after each round of fixes. The score is a tracking instrument, not a verdict.
- Have someone who didn't build the thing fill it in. The team's score and an outsider's score diverging is itself a finding.
- For autonomous self-review, the developer skill should score the surface against this rubric before opening the PR, name the three worst findings (or write "no findings"), and attach both to the PR body. A score below 60 should block the PR unless a clear remediation comment names a follow-up issue.

## Severity bands

- **80–100:** Strong. Most users will move through smoothly. Focus on polish and edge cases.
- **60–79:** Decent. A handful of fixable issues are costing real users real time.
- **40–59:** Weak. Users are muddling through but goodwill is being drained.
- **0–39:** Broken. Stop arguing about flag names and have someone watch a fresh shell run the command.
