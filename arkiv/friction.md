# Friction report — Takedown Ledger

**Environment for every item:** `@arkiv-network/sdk` 0.8.1 · `viem` 2.57.7 · Node 24.2.0 · macOS ·
Tiramisu testnet (chain `7738577`) · Next.js 16.4.2 · date 16 Oct 2026.

Everything below happened while building this project. Items 1–5 are issues; items 6–10 are paths
we tested that worked, documented with the same detail.

---

## 1. Uppercase attribute names: the SDK accepts them, the contract reverts, and the revert message says uppercase is allowed

- **Surface:** TypeScript SDK `createEntity` → Arkiv contract
- **Expected:** `attributes: { filedAt: u64(...) }` is either rejected by the SDK before sending, or accepted on-chain. The revert text lists `"A"-"Z"` as allowed.
- **Actual:** The SDK's client-side validation passes, then the transaction reverts:
  ```
  EntityMutationError: Transaction failed: an attribute name holds "A" (0x41) at byte 5, which is
  outside the name charset ("A"-"Z", "a"-"z", "0"-"9", ".", "-" and "_", with a letter first)
  Error: Ident32InvalidByte(uint256 position, bytes1 value) (5, 0x41)
  ```
  The message says `A` is outside a charset that includes `A`-`Z`.
- **Repro:**
  ```ts
  await wallet.createEntity({ attributes: { filedAt: u64(1) }, payload: new Uint8Array(),
    contentType: "application/octet-stream", expires: ExpirationTime.fromDays(1) })
  ```
- **Workaround:** snake_case for every attribute (`filed_at`, `url_count`, `requester_type`).
- **Suggested fix:** make `validateAttributeName` in `src/attr/names.ts` match the contract (lowercase only), and fix the charset text in the revert decoder. Camel-case is the default JS habit, so this hits almost everyone.

## 2. A bare number in a range query against a `u64` attribute silently returns zero rows

- **Surface:** SDK query builder (`gte`) → query engine
- **Expected:** `gte("filed_at", 1760000000)` matches entities written with `filed_at: u64(...)`, or throws a type error like the one item 7 describes for system attributes.
- **Actual:** A bare JS number infers `i32`. The engine compares an `i32` predicate against `u64` values and returns **0 rows with no error.** Our "government, last 14 days" filter showed nothing when 3 notices matched.
- **Repro:** write `{ filed_at: u64(now) }`, then `select().where(gte("filed_at", now - 86400)).fetch()` → `entities: []`. With `u64(now - 86400)` → 1 row.
- **Suggested fix:** have the engine return an error for a typed mismatch on a known attribute, or document loudly next to `gte`/`lt` that the query value must use the same constructor as the write.

## 3. Same silent mismatch for `key`-typed attributes

- **Surface:** SDK query builder (`eq`)
- **Expected:** `eq("notice", "0x…64 hex")` matches an attribute written as `notice: key("0x…")`.
- **Actual:** A 32-byte hex string infers `str`, and the query returns 0 rows silently. Outcomes didn't show up on their notice page until we wrapped the value in `key(...)`.
- **Repro:** write `{ notice: key(k) }`; `eq("notice", k)` → `[]`; `eq("notice", key(k))` → 1 row.
- **Suggested fix:** same as #2. Also, `eq` could warn when a string literal looks exactly like a 32-byte key.

## 4. `exists()` is exported by the SDK but rejected by the node

- **Surface:** `@arkiv-network/sdk/query` `exists` → JSON-RPC query
- **Expected:** `select().where(exists("type")).fetch()` returns entities that have a `type` attribute.
- **Actual:**
  ```
  QueryError: Query rejected (type, -32002): ... exists(…) is not supported — the index has no
  per-attribute presence set in this version. Query: EXISTS(type)
  ```
- **Repro:** the one-liner above against `https://rpc.tiramisu.db-chain.testnet.arkiv.network`.
- **Suggested fix:** remove `exists` from 0.8.x exports, or mark it `@deprecated`/unsupported in its JSDoc so the IDE shows it before runtime.

## 5. Challenge docs say to range-filter on `$createdAt`, but the SDK says it isn't indexed

- **Surface:** challenge repo `AGENTS.md` ("Sort client-side, or use range filters on `$createdAt`") vs SDK `src/query/expression.ts`
- **Expected:** `gte("$createdAt", ...)` works, as AGENTS.md suggests.
- **Actual:** `expression.ts` lists `$createdAt` in `RESULT_ONLY_SYSTEM_ATTRIBUTES` ("not indexed, so it cannot appear in a predicate"). Only `$key`, `$owner`, `$creator` and `$expiresAt` are queryable.
- **Workaround:** our own `filed_at` u64 attribute.
- **Suggested fix:** update AGENTS.md to say "store your own numeric timestamp attribute", or index `$createdAt`.

---

## Tested paths that worked

### 6. `readonly` + `permissionlessExtension` + ownership transfer = an undeletable record anyone can renew
- `patchEntity` by the owner on a readonly entity → rejected with a clear message: *"was created readonly, so its contents can never change. Its expiry can still be extended, and it can be transferred or deleted"*. That message is what told us a readonly entity can still be **deleted** by its owner, which led to the seal design below.
- `executeBatch({ creates, ownershipChanges: [→ 0x…dEaD] })` using `predictEntityKeys({ owner, count: 1 })` plus the returned `salt`: the predicted key matched the created key on the first try. `deleteEntity` by the original filer is then rejected (*"is owned by 0x…dEaD, not 0xb854…"*).
- `extendEntity` from a **freshly funded stranger wallet** on a `permissionlessExtension` entity succeeded (block 4529443 → 5825443). See `scripts/guarantees.ts` and `scripts/seal-check.ts`.
- **Suggestion:** document the "transfer to an unowned address" pattern. It's the only way to make an entity undeletable, and builders who want permanence will reach for it.

### 7. Type errors on system attributes are excellent
`lt("$expiresAt", someBigint)` throws before sending: *"`$expiresAt` is a u64, but the value is a u256. System attributes have a fixed type — write u64(...) around the value."* That's exactly the behavior we wanted for #2 and #3.

### 8. `watchEntityEvents` over WebSocket
With `webSocket()` transport and no `fromBlock`, `ExpiryExtended` events arrived within one block. One gap: the event's `owner` is the owner, **not the extender**, and the JSDoc says so. To show "preserved by 0x…" we'd need to fetch each transaction's sender. Suggestion: add an `extender`/`sender` field to `ExpiryExtendedEvent`.

### 9. Atomic batch: create + extend
`executeBatch({ creates: [outcome], extensions: [notice] })` worked first time, and `extendedEntities` in the result confirmed the extension. `extendEntity` sets an **absolute** expiry, and the docs state that clearly, so "extend by 30 days" is `atBlock(current + blocks)`.

### 10. Browser CORS and time to first entity
The Tiramisu RPC returns `access-control-allow-origin: *`, so the whole app runs client-side with no backend. Time to first entity: about 2 hours, mostly spent reading SDK source to learn 0.8 query typing.
