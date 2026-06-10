# Clean Architecture Context

Use this context only when the task explicitly involves architecture, use cases, domain boundaries, or when writing or implementing a behavior-changing Linear issue. Do not load it for routine release, copy, metadata, dependency, or visual-polish work unless the issue itself mentions use cases or Clean Architecture.

## Core Rule

Business and application policy belong inward. Frameworks, UI, persistence, SDKs, Lambda events, CLIs, and hosted services are details at the edge.

Dependencies point inward:

```text
Domain
  Entities, value objects, domain rules.
  No SwiftUI, SwiftData, UIKit, StoreKit, ShazamKit, AWS SDKs, HTTP framework types, database records, or CLI process APIs.

Application
  Use cases and application services.
  Owns ports/interfaces for outside capabilities.
  Uses simple inputs/outputs and domain types.

Interface Adapters
  ViewModels, controllers, presenters, DTO mappers, repository implementations.
  Converts between use-case/domain shapes and framework/API/storage shapes.

Frameworks and Drivers
  SwiftUI, SwiftData, Room, DynamoDB, S3, Postgres, API Gateway, Lambda runtime, URLSession, Spotify, ShazamKit, StoreKit, GitHub CLI, Linear, Xcode.
```

## Use Case Catalogs

Each product repo should maintain a small use-case catalog when application behavior is complex enough to benefit from stable vocabulary. Prefer `docs/architecture/use-case-catalog.md` unless repo-local instructions name another path.

Catalog behaviors, not helper methods. If a user, scheduler, webhook, backend caller, or system actor has a goal, it may be a use case. Formatting, DTO mapping, and one-off helper functions are not use cases.

Each catalog entry should stay compact:

```markdown
### RecognizeSong
Actor: User
Goal: Identify currently playing music and produce a provider-neutral recognition result.
Inputs: Recognition mode, timestamp, playback state, permission state.
Outputs: Recognized song, duplicate, permission required, or failure.
Entities / values: RecognitionAttempt, SongCapture, RecognizedSong.
Ports: SongRecognizing, RecognitionRepository, PlaybackControlling, Clock.
Primary adapters: ShazamKitSongRecognizer, SwiftDataRecognitionRepository, MusicPlayerPlaybackAdapter.
Current implementation: `ios/App/...`
```

Update the catalog in the same PR when a ticket creates, renames, removes, or materially changes a use case.

## Work Item Writing

For behavior-changing Linear issues, make the ticket name the application behavior before naming the screen, handler, table, or SDK detail.

Good issue titles:

- `Implement RecognizeSong use case`
- `Extract IngestScreenshot application service`
- `Add SearchHansard query port`
- `Move ReviewSubmission behind repository port`

Weaker issue titles:

- `Update DiscoverView`
- `Fix Lambda handler`
- `Add SwiftData field`
- `Wire Spotify SDK`

Those weaker shapes can still be valid adapter tickets, but the issue must state which use case they serve.

Add a **Clean Architecture Shape** section to behavior-changing issues:

```markdown
## Clean Architecture Shape

Use case:
- `RecognizeSong` - new / existing / changed.

Entities / value objects:
- `RecognitionAttempt`
- `RecognizedSong`

Ports:
- `SongRecognizing`
- `RecognitionRepository`
- `PlaybackControlling`
- `Clock`

Adapters:
- `ShazamKitSongRecognizer`
- `SwiftDataRecognitionRepository`
- `MusicPlayerPlaybackAdapter`
- `SystemClock`

Boundary rule:
- The use case and domain types must not import ShazamKit, SwiftData, SwiftUI, UIKit, or StoreKit.

Catalog update:
- Add or update `docs/architecture/use-case-catalog.md`.
```

For tickets that do not change application behavior, write `N/A - <reason>` instead of forcing fake architecture.

## Implementation

Every cataloged use case should map to a named code artifact, such as a concrete type or function:

```swift
struct RecognizeSong {
    let recognizer: any SongRecognizing
    let repository: any RecognitionRepository
    let playback: any PlaybackControlling
    let clock: any Clock

    func execute(_ input: RecognizeSongInput) async -> RecognizeSongOutput {
        // application policy
    }
}
```

The use case's dependencies should be ports/interfaces. The use case itself does not automatically need a protocol. Add a `RecognizeSongUseCase` protocol only when whole-use-case substitution is useful, such as multiple implementations, cross-module hiding, or tests that need to replace the full use case rather than its ports.

## Composition Root: callable, fully wired, behavior-tested

> This rule is one pillar of the project-level TDD workflow — the executable "project done" signal. For the end-to-end process (test-first lanes, the non-required completeness gate, the human-handoff ratchet), see [`project-tdd-workflow.md`](project-tdd-workflow.md).

Ports and adapters are only correct if something actually wires them together and drives data through them. The most expensive Clean Architecture failure is not a misplaced dependency — it is a **real adapter wired to a port that nothing ever feeds**, or a producer that is constructed but never invoked. The feature compiles, every unit and acceptance test is green, and the behavior is dead end-to-end.

This failure is invisible to per-unit tests precisely *because* the architecture is clean: each side of a seam is tested against a fake of the other side, so no test exercises the wire between them. A use case is tested against a fake store; the store is tested against a fake source; the HTTP handler is tested against a fake store. All pass. Nobody asserts that, in the assembled application, the source feeds the store feeds the handler. The green suite is a **false completeness signal**.

The guarantee against this is disciplined dependency injection plus one behavioral assertion through the real graph. Three conditions, all mechanically checkable:

1. **A single callable composition-root factory.** The application is assembled in one place by a function that returns the wired graph — `buildContainer(edgeOverrides?)`, `buildServer()`, `makeApp()` — *not* inside an entrypoint that reads env, picks ports, and calls `process.exit`/`exit()`. The production entrypoint is a thin caller of that factory. An un-callable `main()` is itself the smell that hides this bug: if a test cannot boot the real app, no test can catch a dead wire.
2. **At least one acceptance test boots the real graph and asserts observable output.** It calls the *same* factory the production entrypoint uses, overrides only true externals at the edge (process exec, network sockets, the system clock, wall-time randomness), runs the real startup/refresh path, and asserts data comes out the far end — not merely that construction succeeded. **A constructed graph is not an exercised graph:** DI guarantees every port has a real object wired in; it does not guarantee any code calls it. This test is the only thing that catches the un-invoked producer.
3. **Fakes and adapters cannot reach production, enforced statically.** Only the composition root imports concrete adapters; nothing outside tests imports a `*Fake*` / `*InMemory*` / `test/**` symbol. Encode this as a dependency-fitness rule (dependency-cruiser for TS/JS, an equivalent boundary test elsewhere) so a leak fails CI rather than waiting for review:

   ```js
   // .dependency-cruiser.cjs — forbidden rules
   { name: 'no-fakes-in-production', severity: 'error',
     from: { path: '^src' },
     to:   { path: '(Fake|InMemory|/test/)', pathNot: '\\.(test|spec)\\.[tj]s$' } },
   { name: 'adapters-only-from-composition-root', severity: 'error',
     from: { path: '^src', pathNot: '^src/(composition|index)' },
     to:   { path: '^src/adapters' } },
   ```

   These rules are **static**: they prove fakes are absent from production wiring and that adapters are instantiated only at the root. They cannot see that a wired edge is never *called* — that is condition 2's job. The two are complementary, not redundant.

**Wire real adapters from the first ticket — as throwing stubs if unimplemented.** When a Project introduces new ports, the foundation ticket should instantiate the **real** adapter for every port in the composition root immediately, with unimplemented method bodies that `throw new Error("not implemented")`. The object graph is then complete and identical in test and production from day one: unimplemented edges fail loudly (red) instead of silently no-opping, fakes never need to appear in the wiring to make it compile, and the composition-root integration test has something real to boot. Implementation tickets fill in the throwing bodies and turn the integration test green.

**Prefer a real, sandboxed edge; fake only when you must; never substitute the adapter.** "Override the external" in condition 2 does not mean "mock it." There is a precedence — use the highest rung your resources allow:

1. **Real, sandboxed edge (best).** When the test host can run the real dependency in a disposable, isolated form, use the real thing. A real database in an ephemeral container (e.g. Testcontainers); the host's own `launchd` driven through a throwaway label + temp plist + harmless `Program` (`/bin/sleep`) + guaranteed `try/finally` teardown; a real localhost server. Gate host-specific ones so other platforms skip rather than fake (`describe.skipIf(process.platform !== 'darwin')`), and run them where the real thing exists (a self-hosted macOS runner *has* launchd). A real edge catches wiring and command-mapping bugs — unresolvable paths, unchecked exit codes, malformed commands — that a fake silently passes.
2. **Edge fake (only when forced).** Fake only when the real dependency is **non-hermetic** (third-party network, real Linear/GitHub mutations, anything costing money or touching shared state) or **unavailable on the host**. Inject the fake at the *true edge* — the `execFile`/exec call, the socket, the SDK client — the thinnest boundary to the outside world.
3. **Adapter substitution (never).** Do not replace the whole adapter to satisfy a test (e.g. swapping in a test-constructed `LaunchctlDaemonController`). That re-introduces the double-sided-fake blind spot one rung up: production's *construction* of that adapter — its wiring, default paths, and orchestration policy — goes untested, which is exactly how a bare-default install-script path or an unchecked exit code ships green. The integration test must use **production's construction of the component under test**, overriding only its outermost edge.

A fake injected at the adapter tests your test's wiring; a real (or edge-faked) external tests production's wiring. So don't fake a dependency you can run real-and-isolated — reach for a fake only when the real edge is non-hermetic or absent.

In short: **green = done only holds if at least one test crosses the composition root with real objects on both sides of every central seam.** Per-unit tests with fakes on both sides can all pass while the application does nothing.

## Migration Pattern

Do not rewrite whole repos just to satisfy this doctrine. Use a ratchet:

- New behavior starts as a use case unless the ticket explicitly justifies an adapter-only change.
- Domain models start platform-free unless there is a documented reason they must be framework records.
- Every external system starts as an adapter behind a port.
- Every high-churn view, handler, or service touched by a ticket should leave one behavior more explicitly named or better isolated.
- Add dependency fitness checks after a reference slice proves the intended boundary.
