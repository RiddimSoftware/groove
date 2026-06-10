# Chapter 15: Space-Based Architecture Style

## Core Principles
- Space-based architecture exists for one purpose: **extreme elasticity, scalability, and high concurrency**, with unpredictable spikes. It removes the database as the synchronous bottleneck by keeping working data in replicated in-memory grids.
- The topology has four named pieces: **Processing Units** (app code + in-memory data grid), **Virtualized Middleware** (Messaging Grid for request routing, Data Grid for replicated cache, optional Processing Grid for orchestration, Deployment Manager for elasticity), **Data Pumps** (async messaging out to the DB), and **Data Readers / Data Writers** (the DB-facing abstraction).
- Processing units **never read or write the DB directly during a transaction**. They read from / write to their local cache; the data pump asynchronously persists. The DB becomes eventually consistent storage, not the system of record at request time.
- **Data Collisions** are the cost of replicated caching. The collision rate is proportional to `N · (UR² / S) · RL` — replication latency and number of instances drive collisions up, cache size drives them down. Architects must compute this, not guess.
- **Replicated caching** wins on performance and fault tolerance (no central server). **Distributed caching** wins on consistency for highly dynamic / large caches. **Near-cache (front + backing)** is explicitly discouraged: front caches drift between processing units, creating inconsistent responsiveness.

## When to Use
- Concert ticketing, online auctions, flash sales, leaderboards — domains with sudden spikes from hundreds to tens of thousands of concurrent users.
- Workloads where any synchronous DB dependency would cap throughput.
- Hybrid cloud + on-prem deployments where transactional processing runs elastically in the cloud and the system of record stays on-prem.

## Characteristic Profile
- Strong on: elasticity, scalability, performance (5-star each).
- Weak on: simplicity, testability, overall cost (caching licenses, infra), data consistency.

## Enforceable Rules
- Processing units must not synchronously read or write the operational database during a request. All DB writes go through a data pump.
- Replicated cache size per processing unit should stay under ~100 MB; above that, use a distributed cache for that domain.
- Every replicated cache must have a documented collision-rate estimate using the book's formula. If the estimate exceeds an acceptable threshold, switch to distributed caching.
- Near-cache (front + backing) patterns are forbidden in space-based deployments — they create inconsistent per-instance state.
- Data pumps must be persistent, FIFO, and idempotent so processing units can keep running when data writers are down.

## Review Questions
- Does this code path bypass the in-memory grid and synchronously hit the DB? Why?
- What is the expected collision rate for this cache at peak load?
- If all processing units crash, what's the data-reader path that re-hydrates the cache from the DB?
- Is the consistency model documented and acceptable for this domain (e.g., inventory must be distributed; reference data may be replicated)?

## Examples
### Violation
- A processing unit writes to the replicated cache, then synchronously writes to the DB before returning to the user. Throughput is now DB-bound; the architecture's whole point is lost.
### Good Implementation
- A bid processing unit updates its local `AuctionBids` replicated cache. The data pump (persistent FIFO queue) asynchronously delivers the update to a domain-based data writer that persists to the DB. On any processing-unit crash, other units still hold the cache. On total crash, a temporary cache owner uses the data reader and reverse data pump to rebuild from the DB.

## Implications
### For Agents
- Only propose space-based when the user has explicitly named a high-elasticity / high-concurrency requirement. Don't reach for it for normal CRUD. When generating processing-unit code, the cache is the source of truth at request time; the DB is downstream. When reviewing, compute and surface the collision rate; don't accept "we'll see in production."
### For Tickets/PRs/CI
- Tickets must specify expected concurrent user load, peak update rate per cache, and acceptable consistency model. PRs must include collision-rate calculations and the data-pump contract. CI must include load tests that exercise the data-pump → data-writer path under simulated processing-unit churn.
