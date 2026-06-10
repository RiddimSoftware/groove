# Customer Team — Linear Issue Templates

Every issue the Customer Team creates follows the global Linear issue quality standard (Title, Context/Background, Acceptance Criteria, Out of Scope, Inputs/Dependencies, Risks/Notes, Definition of Done, Estimate). The templates below are scaffolds — fill in the per-product specifics each time.

All issues are created in the **`Customer` (`CUS`)** team in `Todo` state. The Customer Team never transitions issues past `Todo`, and never opens the product PR — it files the issue and lets the Developer route it.

**Labels:** apply `cus` on every issue. Add a secondary label per template (`bug`, `task`, `churn-risk`). There is no `spike` label and no investigative / finding-only issues — every issue is implementation work that lands a versioned artifact via a PR gated by CI.

**Linking rules:**
- Link every issue to the `Customer — <product>` Initiative.
- Link every issue to the **Customer Need** it resolves (`save_customer_need`), and the Need back to the issue. The Need is the durable "N customers want this" record; the issue is the unit of work.
- **Name the target product repo in the body** (e.g. "Target repo: `YourGithubOrg/bubble-bop`") so the Developer can pick it up without ambiguity.

**On every template, this is out of scope:** replying to the review or any customer-facing message. The human owns all review responses; the Customer Team is a reader and recommender.

## Linear fields to set on every `save_issue` (not body sections)

The templates below are the issue **body** — they populate the `description` field only. The fields below are passed as first-class arguments on the `save_issue` call itself. `estimate` is the one most easily dropped, because it has no place in the body scaffold — set it on every call.

- `team` — the `Customer` (`CUS`) Linear team (resolve once per session via `get_team`).
- `stateId` — **`Todo`**. The Customer Team never creates in `Backlog` and never transitions past `Todo`.
- `labels` — `cus` on every issue + the secondary label named in the template (`bug` / `task` / `churn-risk`).
- `estimate` — **hard requirement on every shippable issue.** A Linear field, *not* a body section. Use the complexity ladder `1, 2, 4, 8, 16` from [`context/linear-standards.md` § *Estimating issues*](https://github.com/YourGithubOrg/agent-config/blob/main/context/linear-standards.md#estimating-issues) — complexity (novel reasoning, AC ambiguity, architectural surface), not effort hours. When in doubt, upgrade one tier. An issue cannot move `Backlog` → `Todo` without it; a CUS issue with no estimate is the defect this section exists to prevent. Read linear-standards § *Estimating issues* once per session before writing issues.

**Typical starting estimates** — a starting point, not a cap; adjust on the ladder and upgrade one tier when the AC has gaps:

| Template | Estimate | Why |
|---|---|---|
| 1 Customer-impacting bug | by the scoped fix | Estimate the identified fix; if the root cause is unknown, investigate it as pre-work first, then file the implementation issue for the fix. |
| 2 Effort / friction reduction | `4` | Surgical change to one existing flow. |
| 3 Billing / trust complaint | `4` | StoreKit/subscription config or copy fix; `8` if the behavior change spans layers. |
| 4 Feature request → Customer Need | `2` | Captures the ask as a Customer Need; ships the concrete change (or a follow-up implementation issue) — never a finding-only ticket. |
| 5 Churn-risk / rating drift | by the dominant driver | Often an umbrella over template 1–3 children; estimate each child fix. |

---

## 1. Customer-impacting bug (from a review) — labels: `cus`, `bug`

**Title:** `[CUS] <product> — <one-line defect> (reported in reviews)`

**Context/Background:** `<N>` reviews this cycle report `<defect>` (severity `<n>`/10, RATER: Reliability). Representative quotes (≤ 15 words, quoted): `"<quote 1>"`, `"<quote 2>"`. Territories: `<list>`. App version(s): `<list>`. Linked Customer Need: `<need link>`. Initiative: `<initiative link>`. Target repo: `YourGithubOrg/<repo>`.

**Acceptance criteria:**
- Root cause identified and fixed, or explicitly scoped for the next release.
- Repro steps confirmed (from review text where extractable, else reproduced locally).
- The linked Customer Need is closed when the fix ships (loop closed), with the release noted.

**Out of scope:**
- Replying to the reviewers (the human owns responses).
- Store-listing changes (route to ASO if the defect is visible in screenshots/metadata).

**Inputs / dependencies:** crash logs / repro from review text; the affected app version; engineering capacity in the next release.

**Risks / notes:** if isolated to one territory or device class, suspect a localization or platform-specific cause. If it correlates with a recent release, the prior version is the comparison baseline.

**Definition of Done:** fix shipped; the Customer Need closed with the resolving release noted; rating recovery tracked into the next cycle.

---

## 2. Effort / friction reduction — labels: `cus`, `task`

**Title:** `[CUS] <product> — reduce effort in <flow>`

**Context/Background:** Customers repeatedly describe a high-effort journey in `<flow>` — `"<quote>"` (`<N>` reports; RATER: Effort). Per *The Effortless Experience*, reducing effort predicts loyalty better than adding delight. Linked Customer Need: `<need link>`. Initiative: `<initiative link>`. Target repo: `YourGithubOrg/<repo>`.

**Acceptance criteria:**
- The specific friction (extra steps, dead-ends, re-entry, confusing state) is removed or materially reduced.
- The effort is measurable before/after where instrumentation exists (steps, taps, repeat-contacts).

**Out of scope:** replying to reviewers; a full redesign of the flow (scope the surgical fix, file follow-ups separately).

**Inputs / dependencies:** the flow's current screens; analytics on drop-off if available.

**Risks / notes:** verify the fix doesn't shift effort elsewhere in the journey (channel/step switching, per the canon).

**Definition of Done:** the friction is gone in a shipped build; the Customer Need closed; effort delta noted if measurable.

---

## 3. Billing / trust complaint — labels: `cus`, `bug`

**Title:** `[CUS] <product> — billing/trust: <one-line>`

**Context/Background:** `<N>` reviews report `<surprise charge | failed refund | subscription confusion>` (RATER: Assurance). Quotes: `"<quote>"`. This is a trust-eroding pattern — left unaddressed it drives churn and 1-star reviews. Linked Customer Need: `<need link>`. Initiative: `<initiative link>`. Target repo: `YourGithubOrg/<repo>`.

**Acceptance criteria:**
- The billing/subscription behavior is corrected, or the confusing surface is clarified.
- If the issue is policy/copy rather than code, the corrected copy is specified and routed.

**Out of scope:** replying to reviewers; issuing individual refunds (operations, not this team — flag as a dependency).

**Inputs / dependencies:** StoreKit / subscription config; the billing copy customers misread.

**Risks / notes:** billing complaints escalate fast and attract regulator/press attention — prioritize accordingly; escalate per Decision Authority if a true billing failure is suspected.

**Definition of Done:** behavior or copy corrected in a shipped build; the Customer Need closed.

---

## 4. Feature request → Customer Need — labels: `cus`, `task`

**Title:** `[CUS] <product> — capture customer ask as a Customer Need: <feature>`

**Context/Background:** `<N>` customers ask for `<feature>` — `"<quote>"`. Framed as a job-to-be-done: the customer is trying to `<job>` and the current app makes them `<workaround>`. The build / defer / decline call is the writer's pre-work — assess the job, the accumulated Customer Need volume, and product strategy before filing. The durable deliverable is the **Customer Need** record; this issue lands it (and, when the call is "build," the concrete implementation work). Linked Customer Need: `<need link>`. Initiative: `<initiative link>`. Target repo: `YourGithubOrg/<repo>`.

**Acceptance criteria:**
- The Customer Need is created/updated under the app's Customer record with the job behind the request and current volume recorded.
- The pre-work's build / defer / decline decision is captured on the Customer Need with rationale.
- If "build", a concrete implementation `task` issue is filed (or this issue carries the change) and the Customer Need is linked to it; if "defer"/"decline," the Customer Need records that disposition for future cycles.

**Out of scope:** re-litigating the build/defer/decline call (settled as pre-work); replying to reviewers.

**Inputs / dependencies:** the Customer Need's accumulated volume; product strategy (defer to the Backlog Team for prioritization).

**Definition of Done:** Customer Need recorded with volume and disposition; concrete implementation issue filed and linked when the decision is "build."

---

## 5. Churn-risk / rating drift — labels: `cus`, `churn-risk`

**Title:** `[CUS] Churn risk: <product> — <signal>`

**Context/Background:** Leading churn indicator fired this cycle: `<rating drift X→Y | spike in "deleting" reviews | refund cluster>`. 30-day rating `<old>` → `<new>` (Δ `<delta>`). Top contributing theme: `<theme>` (severity `<n>`/10). Quotes: `"<quote 1>"`, `"<quote 2>"`. Linked Customer Need(s): `<links>`. Initiative: `<initiative link>`. Target repo: `YourGithubOrg/<repo>`.

**Acceptance criteria:**
- The dominant driver is identified and a remediation is opened or linked (often this issue is the umbrella over template-1/2/3 children).
- Issue closes when the 30-day rating recovers above `<threshold>` or the driver is verified shipped.

**Out of scope:** replying to reviewers; review-gating or incentivized-rating tactics (against App Store guidelines).

**Inputs / dependencies:** rating history from the prior scorecards; the contributing theme's issues.

**Risks / notes:** correlate the drift with the release timeline; a single bad release is a different response than slow erosion.

**Definition of Done:** driver remediated or scoped; rating recovers, or an explicit decision is recorded; Customer Needs updated.
