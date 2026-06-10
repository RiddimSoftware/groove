# CLI / Script / Terminal-Style UI Standards

Standards for any command-line program a user invokes and watches: shell scripts, Makefiles, `npm` / `npx` / `pnpm` / `yarn` commands, Python entry points, Swift CLI binaries, Bash one-liners checked into `bin/`, and any wrapper that fronts one of the above. These standards descend from [`ui-doctrine.md`](ui-doctrine.md). Read that first.

The driving question is the one a user asks the moment they press Enter on `npx <thing>`:

> Is this thing alive, and is it doing what I asked?

Every rule below exists to answer that question without making the user wonder.

## Scope

Apply these rules to any CLI / script / terminal surface that a human, agent, or CI job will invoke and watch. That includes:

- Scripts under `bin/`, `scripts/`, or any other entry-point directory.
- `npm run <foo>`, `npx <package>`, `pnpm <cmd>`, `yarn <cmd>`.
- `make <target>`.
- Custom binaries (Swift, Go, Rust, Python, …) shipped to humans or agents.
- Shell wrappers around the above (e.g. `bin/run-gemini`, `bin/gh-app-token`).
- One-shot deploy / release / migration scripts.

Out of scope (for now): library APIs consumed only by other code, daemons with no human-watched output, and surfaces with their own dedicated standards file in this directory.

## The eight rules

### 1. First byte under ~200 ms

The moment a user invokes the command, *something* must appear on stdout/stderr. Within ~200 ms, print at minimum: **what you are** and **what you're about to do.** Even a single banner line is enough.

```
$ npx foo build
foo build · v3.2.1 · building 24 packages for production
```

The exact wording matters less than the latency. A silent terminal for ten seconds is the single largest reservoir-drain in the CLI surface area, and it is almost always avoidable.

### 2. Show progress on anything longer than ~2 seconds

If any step runs longer than ~2 s, show progress while it runs. Pick the form most honest about the work:

- **Step list** when the work is a sequence of discrete steps: `✓ Resolving deps  ✓ Compiling  → Linking …  ☐ Bundling  ☐ Writing artifacts`.
- **Counter / fraction** when items are countable: `Processed 137 / 412 files`.
- **Percent + ETA** only when the percent is real (you know the total).
- **Streaming log** when the underlying tool is itself verbose and useful.
- **Spinner with a label** as the last resort, when no real signal is available.

Never use more than one of these at a time for the same work. Two spinners and a percent fighting for the same line is noise.

### 3. Name the long step and its rough cost

When a single sub-step dominates wall time (cold install, full compile, large download, deploy wait), say which step it is and roughly how long it usually takes. Give the user the option to step away with confidence.

```
[2/5] Installing dependencies (first run; typically 30–60 s on a warm cache)…
```

This is a direct application of Krug's "managing real-estate challenges shouldn't be done at the cost of usability": don't let opaque waits be the cost of a clean output.

### 4. End with a one-line outcome

Every run ends with an unambiguous one-line outcome. Success or failure, what changed, and what to do next when relevant. Never end on silence.

```
✓ Built 24 packages in 41.3 s · output at ./dist · run `npx foo deploy` to ship
```

```
✗ Build failed in 18.2 s · 3 errors in packages/api · see ./build-log.txt
```

The outcome line must be the last thing on the user's screen. Stack traces and verbose detail belong *above* it, never after.

### 5. Errors refill the reservoir

A good error message has three parts: **what failed**, **why it failed in terms the user can act on**, and **what to do next.** "An error occurred" / "Something went wrong" / a bare stack trace are reservoir drains.

```
✗ Cannot connect to Postgres at localhost:5432.
  Is the dev database running? Try `make db-up`.
  Full error: ECONNREFUSED (timed out after 2 s)
```

When the error is genuinely caused by something the user can fix (missing env var, stale lock file, wrong working directory), name the fix explicitly. When it isn't, apologise and point them to where to look (`./build-log.txt`, an issue tracker, a runbook URL).

### 6. TTY-aware output

Detect whether stdout is a TTY. When it isn't (piped output, CI, log files), change behaviour:

- **Drop spinners and progress bars** — they corrupt non-TTY consumers and read as line noise in logs.
- **Drop ANSI colour** (or honour `NO_COLOR` / `--no-color`).
- **Switch to line-buffered structured progress** — one timestamped line per step, no carriage returns, no overwrites.
- **Flush after every line.** Buffered output that only lands at process exit is invisible during a CI wait.

```
2026-06-03T14:21:08Z [foo] resolving dependencies
2026-06-03T14:21:11Z [foo] compiling 24 packages
2026-06-03T14:21:52Z [foo] bundling
2026-06-03T14:22:05Z [foo] done · 41.3 s · ./dist
```

### 7. Quiet, default, and verbose

Provide three signal levels with sensible defaults:

- **Default** — what a human running the command interactively should see: first byte, progress, outcome, errors with their fix.
- **`--quiet` / `-q`** — outcome and errors only. The mode CI and scripts should pass.
- **`--verbose` / `-v`** — full debug detail. The mode people use when something is broken and they need to see everything.

A `LOG_LEVEL` env var (`error` / `warn` / `info` / `debug`) is the usual implementation lever. Whatever the lever, the defaults must be honest about who's watching. Default is **for a human, watching live**, not for a log archiver.

### 8. No fake progress

A spinner that doesn't reflect real work is worse than no spinner at all — it teaches the user to ignore progress, then bites them the next time the process really is wedged.

- Don't start a spinner before the underlying work actually starts.
- Don't keep spinning past the work — stop it the moment the step ends.
- Don't fake percentages. If you can't compute a real percent, use a step list, a counter, or a labelled spinner.
- Don't print "Done" before the work is done.

If the underlying tool is genuinely silent (a long shell-out with no output), wrap it with a labelled spinner that shows *what step* is running, *not* an invented percent.

## Things to never do

- Silent failure. A non-zero exit code with no message tells the user nothing.
- A spinner that outlives the process. (Common on early-exit error paths.)
- Stack traces dumped *after* a final "Done" line.
- Reading from stdin without a prompt that says you're reading from stdin.
- Asking interactive questions in modes that obviously aren't interactive (CI, `--quiet`, non-TTY). Provide flags or env vars for every question; refuse to start in non-interactive mode if a required answer wasn't supplied, with an outcome line explaining which flag to pass.
- Printing colour or emoji that the user can't disable.
- Emitting "warnings" the user can't act on. Either it's actionable (then say what to do) or it isn't (then drop it).
- Burying the actual outcome under marketing chrome ("Thanks for using foo! Check us out at https://…").

## How to apply on a real PR

1. **Pick the surfaces.** List every command, script, or entry point the change adds, removes, or modifies. Mark each one.
2. **Walk the eight rules.** For each surface, confirm each rule either holds or doesn't apply.
3. **Run the command yourself.** Watch it the way a user would — fresh shell, no cache. If you're not sure whether rule 1 (first byte under ~200 ms) holds, time it.
4. **Run the failure path.** Force at least one error and confirm rule 5. The error path is where reservoirs drain fastest.
5. **Score the surface** with [`cli-scorecard.md`](cli-scorecard.md) if the change is non-trivial. Attach the score and the three worst findings to the PR.

When two of these rules conflict in practice (e.g. word economy vs. naming the long step), defer to [`ui-doctrine.md`](ui-doctrine.md) and to the underlying Krug doctrine — the laws there are the tie-breakers.
