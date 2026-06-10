# ASO Scorecard — Linear comment template

Posted as a comment on the per-product ASO **Initiative** each cycle (the long-running container, not the time-boxed refresh Project). One comment per cycle. Stable header line so humans (and future cycles) can grep.

## Format

```markdown
## ASO Scorecard — YYYY-MM-DD

**Product:** <name> (`<bundleId>`) | **Initiative:** [<INITIATIVE-NAME>](https://linear.app/riddimsoftware/...) | **Open refresh Project:** [<PROJECT-NAME>](https://linear.app/riddimsoftware/...) | none — N issues queued | **Cycle:** <N>
**Cadence:** previous cycle YYYY-MM-DD (Δ days)
**Data quality:** full | partial-data: <reason>

---

### Headline

<2–3 sentences. What changed since last cycle, what's the biggest opportunity now, what's the most urgent risk.>

### Rating

| Window | Current | Δ vs last cycle | Δ vs all-time |
|---|---|---|---|
| 30-day | 4.42 | +0.03 | -0.08 |
| 90-day | 4.46 | -0.01 | -0.04 |

<If a 4.0 cliff or > 0.2 drop fired, the high-priority bug issue is linked here.>

### Metadata audit

| Locale | Title chars | Subtitle chars | Keyword field chars | Failures |
|---|---|---|---|---|
| en-US | 27/30 ✓ | 22/30 ⚠ | 88/100 ⚠ | subtitle short, keyword field has 2 stop words |
| ja-JP | 18/30 ⚠ | 14/30 ⚠ | 56/100 ⚠ | likely machine-translated |

<Full per-locale findings linked to the new issues they generated, if any.>

### Visual assets

- Screenshots: first 3 indexable ✓ / action-oriented ⚠ — captions read as taglines, not verbs.
- Icon: last test <date> (Y months ago).
- App preview video: <present | absent>.

### Custom Product Pages

- Active: 3/70 used.
- Keyword coverage: 1/4 keyword clusters from the keyword field have a CPP.
- Recommendation: stand up CPPs for `<cluster A>`, `<cluster B>`, `<cluster C>` (linked issues below).

### In-app events

- Active events: 0.
- Recommendation: <linked issue>.

### Localization

- Covered: 8/15 top markets.
- Machine-translation flags: ja-JP, ko-KR.
- Recommended additions, ranked by reachable-install ROI: <market 1>, <market 2>, <market 3>.

### Reviews — themes since last cycle

| Theme | Severity (0–10) | Volume | Persistent | Action |
|---|---|---|---|---|
| Onboarding friction | 6.8 | 23 | persistent-3 | → [GROW-42](https://linear.app/riddimsoftware/issue/GROW-42) |
| Sync bug | 8.1 | 14 | new | → [GROW-43](https://linear.app/riddimsoftware/issue/GROW-43) |
| Pricing complaints | 4.2 | 9 | persistent-2 | scorecard only |
| Praise — daily streaks | n/a | 41 | — | praise log |

Representative quotes (≤ 15 words each, in quotation marks).

### Competitor delta

| Competitor | Change | Significance |
|---|---|---|
| <Competitor 1> | New subtitle: `<new copy>` | Claims keyword "<term>" — recommend contest |
| <Competitor 2> | Screenshot redesign | Audit our first 3 screens for parity |

### Experiment backlog (ranked)

1. **<Hypothesis>** — variant spec, success metric, sample-size estimate, risk. → [GROW-44](https://linear.app/riddimsoftware/issue/GROW-44)
2. <…> → [GROW-45](https://linear.app/riddimsoftware/issue/GROW-45)
3. <…> — kept on this scorecard, not yet ticketed (lower confidence).

### Issues created this cycle

- [GROW-43](https://linear.app/riddimsoftware/issue/GROW-43) — rating drift / sync bug `bug`
- [GROW-44](https://linear.app/riddimsoftware/issue/GROW-44) — subtitle test `experiment`
- [GROW-45](https://linear.app/riddimsoftware/issue/GROW-45) — claim contested keyword cluster in en-US keyword field `task`
- [GROW-46](https://linear.app/riddimsoftware/issue/GROW-46) — keyword field cleanup en-US `task`

### Next cycle

- Scheduled: YYYY-MM-DD
- Watch items: <persistent themes, pending tests, unblocked dependencies>
```

## Conventions

- **Hyperlink every issue and PR reference** using the full `https://linear.app/riddimsoftware/issue/<KEY>` form.
- **No emoji** unless the user explicitly asks (per global guidelines).
- **One scorecard per cycle.** If a cycle is no-op, do not post — log one line and exit.
- **Keep quoted review text ≤ 15 words and in quotation marks** (per the global copyright rule).
- **Tag partial-data cycles** explicitly so a reader doesn't read absence-of-finding as pass.
- **Linear issue keys** follow the supplied team's prefix (e.g. `GROW-123`, `SON-45`). Use the team's native key format in all scorecard references, not Jira-style type prefixes.
