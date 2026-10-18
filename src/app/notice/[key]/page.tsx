"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import type { Hex } from "viem"
import {
  EXPLORER,
  fetchNotice,
  fetchOutcomes,
  fmtDate,
  friendlyError,
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
import { Addr, ExpiryBar, fieldClass, isSealed, LiveDot, Pill, Select, Title, TxLink } from "@/components/ui"

const Loading = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-3 w-20 rounded bg-[var(--line)]" />
    <div className="h-7 w-11/12 rounded bg-[var(--line)]" />
    <div className="h-7 w-2/3 rounded bg-[var(--line)]" />
    <div className="h-40 rounded-xl bg-[var(--line)]" />
  </div>
)

export default function NoticePage() {
  return (
    <Suspense fallback={<Loading />}>
      <NoticeView />
    </Suspense>
  )
}

type Msg = { text: string; tx?: string; error?: boolean; source: string }

function NoticeView() {
  const { key } = useParams<{ key: Hex }>()
  const filedTx = useSearchParams().get("filed")
  const head = useHead()
  const { wallet, wrongNetwork, refreshBalance } = useWallet()
  const [notice, setNotice] = useState<Notice | null | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg | null>(null)
  const [outcome, setOutcome] = useState<string>(OUTCOMES[0])
  const [note, setNote] = useState("")

  const load = useCallback(
    () => Promise.all([fetchNotice(key), fetchOutcomes(key)]).then(([n, o]) => (setNotice(n), setOutcomes(o))),
    [key],
  )

  useEffect(() => {
    // fetchNotice swallows errors as "not found", so probe with outcomes first to tell a rate limit from a miss.
    fetchOutcomes(key)
      .then((o) => (setOutcomes(o), fetchNotice(key)))
      .then(setNotice)
      .catch((e) => setLoadError(friendlyError(e)))
  }, [key])

  const live = useLiveEvents({
    onExtended: (e) => {
      if (e.entityKey === key) setNotice((n) => (n ? { ...n, expiresAt: e.expiresAt } : n))
    },
    onCreated: async (e) => {
      // Outcomes are readonly without permissionlessExtension; skip the lookup for anything else.
      if (!e.creationFlags.readonly || e.creationFlags.permissionlessExtension) return
      const o = toOutcome(await publicClient.getEntity(e.entityKey).catch(() => ({})))
      if (o && o.notice.toLowerCase() === key.toLowerCase())
        setOutcomes((cur) => (cur.some((c) => c.key === o.key) ? cur : [...cur, o]))
    },
  })

  const run = async (label: string, fn: () => Promise<{ txHash: string }>, done: string) => {
    if (!wallet) {
      setMsg({
        text: wrongNetwork
          ? "Switch your wallet to the Tiramisu network (top right)."
          : "Connect a wallet first (top right). The in-browser test wallet works.",
        error: true,
        source: label,
      })
      return false
    }
    setBusy(label)
    setMsg(null)
    try {
      const { txHash } = await fn()
      setMsg({ text: done, tx: txHash, source: label })
      await load()
      refreshBalance()
      return true
    } catch (e) {
      setMsg({ text: friendlyError(e), error: true, source: label })
      return false
    } finally {
      setBusy(null)
    }
  }

  const preserve = () => run("preserve", () => preserveNotice(wallet!, notice!), `Preserved for ${PRESERVE_DAYS} more days.`)

  if (loadError)
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="rounded-xl border border-[var(--accent)] bg-[var(--card)] p-4 text-sm">{loadError}</p>
      </div>
    )
  if (notice === undefined) return <Loading />
  if (notice === null)
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="font-serif text-xl">This notice isn&apos;t on Arkiv any more.</p>
        <p className="text-sm text-[var(--muted)]">
          It may have expired, or the link is wrong. Its creation transaction is still in chain history:{" "}
          <a className="underline" href={`${EXPLORER}/entity/${key}`} target="_blank" rel="noreferrer">
            view on explorer ↗
          </a>
        </p>
      </div>
    )

  const p = notice.payload
  return (
    <div className="grid gap-8 pb-28 lg:grid-cols-[1fr_320px] lg:pb-0">
      <article className="min-w-0 space-y-6">
        <div>
          <BackLink />
          {filedTx && <SealedBanner notice={notice} tx={filedTx} />}
          <div className="mt-4 mb-2 flex flex-wrap gap-1.5">
            <Pill tone="accent">{JURISDICTIONS[notice.jurisdiction] ?? notice.jurisdiction}</Pill>
            <Pill>{notice.requesterType}</Pill>
            <Pill>{notice.category}</Pill>
          </div>
          <h1 className="font-serif text-2xl leading-snug sm:text-3xl">
            <Title title={p.title} />
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {notice.platform} · {notice.urlCount} URL{notice.urlCount === 1 ? "" : "s"} · filed {fmtDate(notice.filedAt)}
          </p>
        </div>

        <dl className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--card)] text-[15px] sm:text-sm">
          {[
            ["Requested by", p.requester],
            ["Legal basis cited", p.legalBasis],
            ["What was demanded", p.summary],
            ["Content targeted", p.targetDescription],
          ].map(([k, v]) => (
            <div key={k} className="p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{k}</dt>
              <dd className="mt-1 leading-relaxed break-words">{v || "—"}</dd>
            </div>
          ))}
        </dl>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl">What happened next</h2>
            <LiveDot live={live} />
          </div>
          {outcomes.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No outcome recorded yet. Know what happened? Add it below.</p>
          ) : (
            <ol className="space-y-4 border-l-2 border-[var(--line)] pl-4">
              {outcomes.map((o) => (
                <li key={o.key} className="relative">
                  <span className="absolute top-1.5 -left-[23px] h-3 w-3 rounded-full border-2 border-[var(--bg)] bg-[var(--ink)]" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={o.outcome === "refused" || o.outcome === "reinstated" ? "ok" : o.outcome === "complied" ? "accent" : "warn"}>
                      {o.outcome}
                    </Pill>
                    <span className="text-xs text-[var(--muted)]">
                      {fmtDate(o.filedAt)} · by <Addr a={o.creator} />
                    </span>
                    {o.creator.toLowerCase() === notice.creator.toLowerCase() && <Pill>original filer</Pill>}
                  </div>
                  {o.note && <p className="mt-1.5 text-sm leading-relaxed">{o.note}</p>}
                </li>
              ))}
            </ol>
          )}

          <form
            className="mt-5 space-y-3 rounded-xl border border-dashed border-[var(--line)] p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              // Keep the note on failure so it doesn't have to be retyped.
              if (await run("outcome", () => fileOutcome(wallet!, notice, outcome, note.trim()), "Outcome recorded."))
                setNote("")
            }}
          >
            <h3 className="text-sm font-semibold">Record an outcome</h3>
            <Select label="What happened" value={outcome} onChange={setOutcome} options={OUTCOMES.map((v) => ({ value: v, label: v }))} />
            <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
              <span className="flex justify-between gap-2">
                Note — no personal data
                <span className="font-normal tabular-nums">{note.length}/280</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Platform withheld the posts in-country only"
                maxLength={280}
                rows={2}
                className={fieldClass}
              />
            </label>
            <button
              disabled={!!busy}
              className="w-full rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)] disabled:opacity-50 sm:w-auto"
            >
              {busy === "outcome" ? "Writing to Arkiv…" : "Record outcome"}
            </button>
            {msg?.source === "outcome" && <Status msg={msg} />}
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              Outcomes are readonly and live {OUTCOME_DAYS} days. If the notice would expire sooner, the same atomic batch
              extends it so the record stays whole.
            </p>
          </form>
        </section>
      </article>

      <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="hidden rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 lg:block">
          <h2 className="mb-2 font-semibold">Keep this on the record</h2>
          <ExpiryBar n={notice} head={head} />
          <p className="mt-3 mb-3 text-xs leading-relaxed text-[var(--muted)]">
            Anyone can push its expiry {PRESERVE_DAYS} days later (<code className="font-mono">permissionlessExtension</code>).
            No one can shorten it.
          </p>
          <PreserveButton busy={busy} onClick={preserve} />
          {msg?.source === "preserve" && <div className="mt-2"><Status msg={msg} /></div>}
        </div>

        <div className="space-y-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 text-xs">
          <h2 className="mb-1 text-sm font-semibold">On-chain proof</h2>
          <Row k="Filed by">
            <Link href={`/filer/${notice.creator}`} className="font-mono underline">{notice.creator.slice(0, 10)}…</Link>
          </Row>
          <Row k="Owner">{isSealed(notice) ? <span className="text-[var(--ok)]">🔒 0x…dEaD — undeletable</span> : <Addr a={notice.owner} />}</Row>
          <Row k="Contents">{notice.readonly ? <span className="text-[var(--ok)]">readonly — unchangeable</span> : "mutable"}</Row>
          <Row k="Created at block">{notice.createdAt.toString()}</Row>
          <Row k="Expires at block">{notice.expiresAt.toString()}</Row>
          <Row k="Entity key">
            <a href={`${EXPLORER}/entity/${notice.key}`} target="_blank" rel="noreferrer" className="font-mono underline">
              {notice.key.slice(0, 10)}… ↗
            </a>
          </Row>
        </div>
      </aside>

      {/* Mobile: the main action stays in reach instead of below the whole article. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--card)]/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {msg?.source === "preserve" && <div className="mb-2"><Status msg={msg} /></div>}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <ExpiryBar n={notice} head={head} />
          </div>
          <PreserveButton busy={busy} onClick={preserve} compact />
        </div>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/" className="inline-block py-1 text-sm text-[var(--muted)] hover:text-[var(--ink)]">
      ← Back to ledger
    </Link>
  )
}

function PreserveButton({ busy, onClick, compact }: { busy: string | null; onClick: () => void; compact?: boolean }) {
  return (
    <button
      disabled={!!busy}
      onClick={onClick}
      className={`shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${compact ? "" : "w-full"}`}
    >
      {busy === "preserve" ? "Extending…" : `Preserve +${PRESERVE_DAYS}d`}
    </button>
  )
}

function Status({ msg }: { msg: Msg }) {
  return (
    <p className={`text-xs ${msg.error ? "text-[var(--accent)]" : "text-[var(--ok)]"}`} role="status">
      {msg.error ? "" : "✓ "}
      {msg.text} {msg.tx && <TxLink hash={msg.tx} />}
    </p>
  )
}

/** Shown right after filing: the three things the atomic batch just did, verified from chain state. */
function SealedBanner({ notice, tx }: { notice: Notice; tx: string }) {
  const steps = [
    ["Created on Arkiv", true],
    ["Made readonly — no one can edit it", notice.readonly],
    ["Ownership moved to 0x…dEaD — no one can delete it", isSealed(notice)],
  ] as const
  return (
    <div className="mt-3 rounded-xl border border-[var(--ok)] bg-[var(--card)] p-4">
      <p className="font-semibold text-[var(--ok)]">Filed and sealed in one transaction</p>
      <ul className="mt-2 space-y-1 text-sm">
        {steps.map(([label, ok]) => (
          <li key={label} className="flex gap-2">
            <span className={ok ? "text-[var(--ok)]" : "text-[var(--accent)]"}>{ok ? "✓" : "✕"}</span>
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Transaction <TxLink hash={tx} />. Share this page&apos;s link — anyone can read and preserve it.
      </p>
    </div>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-[var(--muted)]">{k}</span>
      <span className="min-w-0 text-right break-all">{children}</span>
    </div>
  )
}
