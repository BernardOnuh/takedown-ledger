# Takedown Ledger

**A public record of content takedown demands that no operator can quietly erase.** Built on
[Arkiv](https://arkiv.network), the Web3 database, for the Arkiv Global Tour Stop (pre-Devcon 8).
Track: **Censorship Resistance**.

**Live app:** https://takedown-ledger.vercel.app

> All notices in the demo are **synthetic**. No real people, no real notices.

## The problem

Governments, courts and companies send huge numbers of demands to remove content. The public record of
those demands is thin and fragile: transparency reports are published at platforms' discretion, and the
largest public archive of takedown notices is run by a single organisation that has had to restrict
public access under pressure. When the record of censorship can itself be removed, censorship becomes
invisible.

## What it does

- **File a notice:** jurisdiction, who asked, the legal basis cited, what was targeted.
- **Readonly + sealed:** each notice is a `readonly` Arkiv entity whose ownership moves to `0x…dEaD` in the
  same atomic batch. Nobody can edit it, and nobody, including a filer under pressure, can delete it.
- **Preserve:** notices live 90 days. Anyone can extend one (`permissionlessExtension`), so the public
  decides what stays on the record. An "expiring soon" panel queries `$expiresAt`.
- **Outcomes:** record what happened (complied, refused, challenged, reinstated). An atomic batch keeps the
  notice alive at least as long as its outcome.
- **Attributed:** `$creator` shows who filed every notice and outcome, and powers the filer page.
- **Live:** WebSocket entity events push new notices and extensions into the UI with no refresh.

See [`arkiv/schema.md`](arkiv/schema.md) for entity types, attributes, lifetimes and queries, and
[`arkiv/friction.md`](arkiv/friction.md) for the friction report.

## Why Arkiv

| Alternative | What breaks |
|---|---|
| Postgres / own API | An operator can be compelled to delete rows or restrict access. That's the exact failure we're fixing. |
| IPFS | Content vanishes when unpinned, there are no queries, and no lifetime the public can extend. |
| Subgraph | Only indexes data that must live somewhere else first. |

**Kept off Arkiv:** the removed content itself, all personal data, original scanned notices.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000 (reads straight from Tiramisu, no backend)
```

Reading needs no wallet. To write, use **Connect → In-browser test wallet** (no extension needed) or
MetaMask, then fund the address at the [Arkiv faucet](https://hub.arkiv.network/faucet).

### Reproduce our Arkiv usage (for judges)

```bash
npm run verify         # read-only: runs every query the app uses, prints the results. No key needed.
```

Optional, needs a funded **testnet-only** key in `.env.local` as `ARKIV_PRIVATE_KEY=0x…`:

```bash
npm run seed           # files the 10 synthetic notices + 7 outcomes
npm run seal-check     # files one notice, then proves its own filer can't delete it
npm run guarantees     # proves readonly is enforced and a stranger wallet can extend
```

## On-chain evidence (Tiramisu)

| Address | Role |
|---|---|
| `0xb8543400C0A46bDce6acC9f776E38Da887973c6F` | Seed filer: created all demo notices and outcomes (`$creator`) |
| `0x000000000000000000000000000000000000dEaD` | Seal owner of every notice (nobody holds this key) |
| `0x02bD…Fb94` (throwaway) | Stranger wallet that extended a notice in `scripts/guarantees.ts` |

Explorer: https://tiramisu.explorer.arkiv.network/address/0xb8543400C0A46bDce6acC9f776E38Da887973c6F

## Stack

Next.js 16 (App Router, client-side reads) · `@arkiv-network/sdk` 0.8.1 · viem · Tailwind CSS.

## License

MIT
