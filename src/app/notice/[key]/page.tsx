"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import type { Hex } from "viem"
import {
  EXPLORER,
  fetchNotice,
  fetchOutcomes,
  fmtDate,
  JURISDICTIONS,
  OUTCOME_DAYS,
  OUTCOMES,
  PRESERVE_DAYS,
  publicClient,
  toOutcome,
  type Notice,
  type Outcome,
} from "@/lib/arkiv"
import { useHead, useLiveEvents } from "@/lib/hooks"
import { useWallet } from "@/lib/wallet"
import { fileOutcome, preserveNotice } from "@/lib/writes"
import { Addr, Expiry, isSealed, LiveDot, Pill, Select, TxLink } from "@/components/ui"

export default function NoticePage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading from Arkiv…</p>}>
      <NoticeView />
    </Suspense>
  )
}

function NoticeView() {
  const { key } = useParams<{ key: Hex }>()
  const head = useHead()
  const { wallet, refreshBalance } = useWallet()
  const [notice, setNotice] = useState<Notice | null | undefined>(undefined)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; tx?: string; error?: boolean } | null>(null)
  const [outcome, setOutcome] = useState<string>(OUTCOMES[0])
  const [note, setNote] = useState("")

  const load = useCallback(
    () => Promise.all([fetchNotice(key), fetchOutcomes(key)]).then(([n, o]) => (setNotice(n), setOutcomes(o))),
    [key],
  )

  useEffect(() => {
    fetchNotice(key).then(setNotice)
    fetchOutcomes(key).then(setOutcomes)
  }, [key])

  const live = useLiveEvents({
    onExtended: (e) => {
      if (e.entityKey === key) setNotice((n) => (n ? { ...n, expiresAt: e.expiresAt } : n))
    },
    onCreated: async (e) => {
      const o = toOutcome(await publicClient.getEntity(e.entityKey).catch(() => ({})))
      if (o && o.notice.toLowerCase() === key.toLowerCase())
        setOutcomes((cur) => (cur.some((c) => c.key === o.key) ? cur : [...cur, o]))
    },
  })

  const run = async (label: string, fn: () => Promise<{ txHash: string }>, done: string) => {
    if (!wallet) return setMsg({ text: "Connect a wallet first (top right).", error: true })
    setBusy(label)
    setMsg(null)
    try {
      const { txHash } = await fn()
      setMsg({ text: done, tx: txHash })
      await load()
      refreshBalance()
    } catch (e) {
      setMsg({ text: (e as Error).message.split("\n")[0], error: true })
    } finally {
      setBusy(null)
    }
  }

  if (notice === undefined) return <p className="text-sm text-[var(--muted)]">Loading from Arkiv…</p>
  if (notice === null)
    return (
      <div className="space-y-2">
        <p>This notice is not on Arkiv — it may have expired, or the key is wrong.</p>
        <p className="text-sm text-[var(--muted)]">
          Its creation transaction is still in chain history:{" "}
          <a className="underline" href={`${EXPLORER}/entity/${key}`} target="_blank" rel="noreferrer">explorer</a>.
        </p>
      </div>
    )

  const p = notice.payload
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <article className="space-y-6">
        <div>
          <Link href="/" className="text-xs text-[var(--muted)] underline">← Ledger</Link>
          <div className="mt-3 mb-2 flex flex-wrap gap-1.5">
            <Pill tone="accent">{JURISDICTIONS[notice.jurisdiction] ?? notice.jurisdiction}</Pill>
            <Pill>{notice.requesterType}</Pill>
            <Pill>{notice.category}</Pill>
          </div>
          <h1 className="font-serif text-2xl leading-snug sm:text-3xl">{p.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {notice.platform} · {notice.urlCount} URL{notice.urlCount === 1 ? "" : "s"} · filed {fmtDate(notice.filedAt)}
          </p>
        </div>

        <dl className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--card)] p-4 text-sm">
          {[
            ["Requested by", p.requester],
            ["Legal basis cited", p.legalBasis],
            ["What was demanded", p.summary],
            ["Content targeted", p.targetDescription],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">{k}</dt>
              <dd className="mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl">What happened</h2>
            <LiveDot live={live} />
          </div>
          {outcomes.length === 0 && <p className="text-sm text-[var(--muted)]">No outcome recorded yet.</p>}
          <ol className="space-y-3 border-l-2 border-[var(--line)] pl-4">
            {outcomes.map((o) => (
              <li key={o.key}>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={o.outcome === "refused" || o.outcome === "reinstated" ? "ok" : o.outcome === "complied" ? "accent" : "warn"}>
                    {o.outcome}
                  </Pill>
                  <span className="text-xs text-[var(--muted)]">{fmtDate(o.filedAt)} by <Addr a={o.creator} /></span>
                  {o.creator.toLowerCase() === notice.creator.toLowerCase() && <Pill>original filer</Pill>}
                </div>
                {o.note && <p className="mt-1 text-sm">{o.note}</p>}
              </li>
            ))}
          </ol>

          <form
            className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-[var(--line)] p-3"
            onSubmit={(e) => {
              e.preventDefault()
              run("outcome", () => fileOutcome(wallet!, notice, outcome, note.trim()), "Outcome recorded.")
              setNote("")
            }}
          >
            <div className="flex flex-wrap items-end gap-2">
              <Select label="Record an outcome" value={outcome} onChange={setOutcome} options={OUTCOMES.map((v) => ({ value: v, label: v }))} />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened? (no personal data)"
                maxLength={280}
                className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--card)] px-2 py-1.5 text-sm"
              />
              <button disabled={!!busy} className="rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm text-[var(--bg)] disabled:opacity-50">
                {busy === "outcome" ? "Writing…" : "Record"}
              </button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Outcomes are readonly and live {OUTCOME_DAYS} days. If the notice would expire sooner, the same atomic batch
              extends it so the record stays whole.
            </p>
          </form>
        </section>
      </article>

      <aside className="space-y-4">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-4">
          <h2 className="mb-1 font-semibold">Keep this on the record</h2>
          <p className="mb-2"><Expiry n={notice} head={head} /></p>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Created with <code className="font-mono">permissionlessExtension</code>: anyone can push its expiry{" "}
            {PRESERVE_DAYS} days later. No one can shorten it.
          </p>
          <button
            disabled={!!busy}
            onClick={() => run("preserve", () => preserveNotice(wallet!, notice), `Preserved for ${PRESERVE_DAYS} more days.`)}
            className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "preserve" ? "Extending…" : `Preserve +${PRESERVE_DAYS} days`}
          </button>
          {msg && (
            <p className={`mt-2 text-xs ${msg.error ? "text-[var(--accent)]" : "text-[var(--ok)]"}`}>
              {msg.text} {msg.tx && <TxLink hash={msg.tx} />}
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--card)] p-4 text-xs">
          <h2 className="mb-1 text-sm font-semibold">On-chain proof</h2>
          <Row k="Filed by ($creator)"><Link href={`/filer/${notice.creator}`} className="font-mono underline">{notice.creator.slice(0, 10)}…</Link></Row>
          <Row k="Owner">{isSealed(notice) ? <span className="text-[var(--ok)]">sealed (0x…dEaD) — undeletable</span> : <Addr a={notice.owner} />}</Row>
          <Row k="Contents">{notice.readonly ? <span className="text-[var(--ok)]">readonly — unchangeable</span> : "mutable"}</Row>
          <Row k="Created at block">{notice.createdAt.toString()}</Row>
          <Row k="Expires at block">{notice.expiresAt.toString()}</Row>
          <Row k="Entity key">
            <a href={`${EXPLORER}/entity/${notice.key}`} target="_blank" rel="noreferrer" className="font-mono underline">
              {notice.key.slice(0, 10)}…
            </a>
          </Row>
        </div>
      </aside>
    </div>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[var(--muted)]">{k}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}
