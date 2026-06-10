# CX Scorecard — Linear comment template

Posted as a comment on the per-product **`Customer — <product>` Initiative** each cycle that has something to report. One comment per cycle. Stable header line so humans (and future cycles) can grep. **A no-op cycle does not post — log one line and exit.**

## Format

```markdown
## CX Scorecard — YYYY-MM-DD

**Product:** <name> (`<bundleId>`) | **Initiative:** [Customer — <name>](https://linear.app/riddimsoftware/...) | **Cycle:** <N>
**Cadence:** previous cycle YYYY-MM-DD (Δ days)
**Data quality:** full | partial-data: <reason>

---

### Headline

<2–3 sentences. What changed for customers since last cycle, the biggest opportunity to improve the experience, and the most urgent risk.>

### CX score

**<score>/10** (Δ <+/-x.x> vs last cycle) — trajectory: improving | flat | declining

| Dimension | Deduction | Why |
|---|---|---|
| Reliability | −2.0 | Crash on launch (iPad) reported, no tracked issue → now [CUS-43](https://linear.app/riddimsoftware/issue/CUS-43) |
| Responsiveness | 0 | Rating flat |
| Effort | −1.0 | "Had to re-enter card 3×" — [CUS-44](https://linear.app/riddimsoftware/issue/CUS-44) |
| Closed-loop | −0.5 | CUS-31 fix shipped in 2.4.0 but Need still open |

### Rating

| Window | Current | Δ vs last cycle | Δ vs all-time |
|---|---|---|---|
| 30-day | 4.31 | −0.04 | −0.12 |
| 90-day | 4.40 | −0.01 | −0.05 |

<If a 4.0 cliff or > 0.2 drop fired, the top-priority bug issue is linked here.>

### Review themes since last cycle

| Theme | Type | Severity (0–10) | Volume | RATER | Persistent | Action |
|---|---|---|---|---|---|---|
| iPad launch crash | bug | 8.4 | 11 | Reliability | new | → [CUS-43](https://linear.app/riddimsoftware/issue/CUS-43) |
| Card re-entry friction | effort | 6.1 | 8 | Effort | persistent-2 | → [CUS-44](https://linear.app/riddimsoftware/issue/CUS-44) |
| Surprise renewal charge | billing | 5.5 | 6 | Assurance | new | → [CUS-45](https://linear.app/riddimsoftware/issue/CUS-45) |
| "Love the new widget" | praise | n/a | 19 | — | — | praise log |

Representative quotes (≤ 15 words each, in quotation marks).

### Customer Needs

| Need | Linked issue | Volume (this cycle / total) | Status |
|---|---|---|---|
| [Stop double-charging renewals](https://linear.app/riddimsoftware/...) | [CUS-45](https://linear.app/riddimsoftware/issue/CUS-45) | 6 / 14 | open |
| [Fix iPad launch crash](https://linear.app/riddimsoftware/...) | [CUS-43](https://linear.app/riddimsoftware/issue/CUS-43) | 11 / 11 | open (new) |

### Closed-loop status

- Shipped for customers since last cycle: <list merged fixes + the Need each closes>.
- Loops left open: <Needs whose fix shipped but weren't closed — reconcile in next Needs Sync>.

### New reviews — digest for your reply workflow

<Compact list of new reviews this cycle (rating, territory, ≤ 15-word quote) so the human has them in one place. The Customer Team does not reply; this is raw material for the human who does.>

### Issues created this cycle

- [CUS-43](https://linear.app/riddimsoftware/issue/CUS-43) — iPad launch crash `bug`
- [CUS-44](https://linear.app/riddimsoftware/issue/CUS-44) — reduce card re-entry friction `task`
- [CUS-45](https://linear.app/riddimsoftware/issue/CUS-45) — surprise renewal charge `bug`

### Next cycle

- Watch items: <persistent themes, ratings near a threshold, Needs awaiting a fix to close the loop>.
```

## Conventions

- **Hyperlink every issue, PR, and Customer Need** using the full `https://linear.app/riddimsoftware/...` form.
- **No emoji** unless the user explicitly asks (per global guidelines).
- **One scorecard per cycle, and only if there's something to report.** A no-op cycle logs one line and does not post.
- **Keep quoted review text ≤ 15 words and in quotation marks** (per the global copyright rule).
- **Tag partial-data cycles** explicitly so a reader doesn't read absence-of-finding as pass.
- **Never include a drafted or suggested review reply.** Surface the review in the digest; the human writes the response.
- **Linear issue keys** use the `Customer` team's native prefix (`CUS-123`).
