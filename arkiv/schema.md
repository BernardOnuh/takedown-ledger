# Arkiv schema — Takedown Ledger

Network: **Tiramisu** (chain ID `7738577`) · SDK `@arkiv-network/sdk` 0.8.1
Every entity carries `app = "takedown-ledger-v1"` so queries never pick up other apps' data.

Code: [`src/lib/arkiv.ts`](../src/lib/arkiv.ts) (reads) · [`src/lib/writes.ts`](../src/lib/writes.ts) (writes)

---

## Entity type 1 — `notice`

A demand to remove content, as received by a platform, publisher or author.

| Attribute | Type | Why it is an attribute (not payload) |
|---|---|---|
| `app` | str | Namespace filter on every query |
| `type` | str = `"notice"` | Entity-type discriminator |
| `jurisdiction` | str (ISO-3166 alpha-2, or `OTHER`) | Feed filter, per-country counts |
| `requester_type` | str: `government` · `court` · `police` · `corporate` · `individual` | Feed filter, "state actor" stat |
| `category` | str: `political-speech` · `journalism` · `copyright` · `defamation` · `national-security` · `protest` · `other` | Feed filter |
| `platform` | str | Shown on every card |
| `url_count` | i32 | **Range** filter: `url_count >= 10/50/100` (mass takedowns) |
| `filed_at` | u64 (unix seconds) | **Range** filter: "filed in last N days"; client-side sort |

**Payload** (`application/json`, not queryable — only displayed):
`{ title, requester, legalBasis, summary, targetDescription }`

**Creation flags:** `readonly: true`, `permissionlessExtension: true`

**Ownership:** created by the filer, then — **in the same atomic batch** — transferred to
`0x000000000000000000000000000000000000dEaD`. The key is predicted up front with
`predictEntityKeys` so the transfer can reference it. `$creator` keeps the filer's address forever.

**Expiration:** **90 days** at creation.
- Anyone can **Preserve**: `extendEntity` to `currentExpiry + 30 days` (permissionless).
- Filing an outcome extends the notice to outlive the outcome (see below).
- Why 90: long enough to cover a typical takedown → appeal cycle, short enough that notices nobody
  cares about lapse on their own. Survival is a public signal of importance, decided by the public.

## Entity type 2 — `outcome`

What happened to a notice: complied, refused, challenged, reinstated…

| Attribute | Type | Why |
|---|---|---|
| `app` | str | Namespace |
| `type` | str = `"outcome"` | Discriminator |
| `notice` | key (bytes32 entity key) | Join: outcomes for a notice |
| `outcome` | str: `complied` · `refused` · `partially-complied` · `challenged` · `reinstated` | Shown as status, colour-coded |
| `filed_at` | u64 | Timeline ordering (client-side) |

**Payload:** `{ note }` · **Flags:** `readonly: true` · **Owner:** the filer (they may want to file corrections as new outcomes)

**Expiration:** **180 days.** Outcomes are the answer to "did censorship work?", which matters for longer
than the request itself. When an outcome is filed and the notice would expire before it, the **same
`executeBatch`** creates the outcome and extends the notice to `outcomeExpiry + 300 blocks` — so an
outcome never outlives the notice it refers to. Both succeed or neither does.

---

## Queries the app runs

| # | Where | Query | Notes |
|---|---|---|---|
| 1 | Ledger feed | `app = APP && type = "notice"` [+ `jurisdiction = X`] [+ `requester_type = X`] [+ `category = X`] [+ `url_count >= N` (i32)] [+ `filed_at >= now-N·86400` (u64)] | Compound predicate, cursor-paginated 200/page, sorted client-side by `filed_at` (no server ORDER BY) |
| 2 | At-risk panel | `app = APP && type = "notice" && $expiresAt < u64(head + 14 days of blocks)` | System attribute range query |
| 3 | Notice page | `getEntity(key)` | Shows `$creator`, `$owner`, flags, `createdAt`, `expiresAt` |
| 4 | Notice page | `app = APP && type = "outcome" && notice = key(noticeKey)` | Join by key-typed attribute |
| 5 | Filer page | `app = APP && type = "notice"` + `.createdBy(addr)` | Works even after ownership is sealed away, because `$creator` is immutable |

**Live updates:** `watchEntityEvents` on a **WebSocket** transport, no `fromBlock`
(`src/lib/hooks.ts`). `EntityCreated` → fetch entity, add to feed / timeline if it is ours.
`ExpiryExtended` → update the countdown in place.

## Writes

| Action | SDK call | Who |
|---|---|---|
| File notice | `executeBatch({ creates: [notice w/ predicted salt], ownershipChanges: [→ 0x…dEaD] })` | Anyone with test GLM |
| Record outcome | `executeBatch({ creates: [outcome], extensions: [notice, if needed] })` | Anyone |
| Preserve | `extendEntity({ entityKey, expires: atBlock(current + 30d) })` | Anyone (permissionless) |

## Deliberately off Arkiv

- The removed content itself (only a description of it).
- Any personal data. Requesters are organisations; the UI warns filers. Demo data is **synthetic**.
- Original scanned notices (a future version would store only a content hash).
- Wallet private keys: the in-browser test wallet keeps its key in that browser's `localStorage` only.
