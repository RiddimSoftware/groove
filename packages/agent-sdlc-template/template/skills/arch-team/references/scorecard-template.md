# Architecture Scorecard — Linear comment template

Posted as a comment on the repository's **Architecture Initiative** or its parent Project.

## Format

```markdown
## Architecture Scorecard — YYYY-MM-DD

**Scope:** <Repo Name> | <Module Path>
**Score:** <N.N>/10.0
**Trend:** <↑ +N.N from last audit | ↓ -N.N from last audit | — First audit>
**Status:** <Healthy | Warning | Critical>

---

### Headline
<2–3 sentences summarizing the biggest architectural strength and the most urgent "smell" found in this scope.>

### Deduction Breakdown

| Deduction | Category | Specific Finding |
|---|---|---|
| -2.0 | Cardinal Sin | `Domain/User.swift` imports `UIKit` |
| -1.5 | Hidden Dependency | `PaymentService.swift` uses `Stripe SDK` directly without a Port |
| ... | ... | ... |

### Layer Map
- **Domain:** <List key entities / value objects found>
- **Application:** <List key use cases found>
- **Adapters:** <List key viewmodels / repos / controllers found>
- **Frameworks:** <List detected external frameworks / drivers>

### Use Case Catalog Status
- [ ] Catalog exists at `docs/architecture/use-case-catalog.md`
- [ ] Implementation matches catalog
- [ ] Behavioral coverage: <N>% of public entry points have a mapped use case

### Enforcement Coverage
| Rule | Enforced By | Status |
|---|---|---|
| Dependency Rule (inward only) | <lint / structural test / CI gate / doc-only> | ✅ / ⚠️ Doc-only |
| Cross-cutting via Providers | <lint / structural test / doc-only> | ✅ / ⚠️ Doc-only |
| <other documented boundary rule> | <enforcement mechanism> | ✅ / ⚠️ Doc-only |

### Issues Created this Cycle
- [ARCH-101](...) — Decouple User entity from UIKit `bug`
- [ARCH-102](...) — Extract StripePort from PaymentService `task`
- ...

### Next Steps
- [ ] Sync Use Case Catalog
- [ ] Graduate doc-only rules to lints (Harness Review issues above)
- [ ] Prioritize "Cardinal Sin" refactors in next Sprint
```
