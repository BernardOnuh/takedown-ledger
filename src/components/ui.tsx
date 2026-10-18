"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import {
  AT_RISK_DAYS,
  blocksFromDays,
  EXPLORER,
  fmtDate,
  JURISDICTIONS,
  NOTICE_DAYS,
  SEAL_ADDRESS,
  short,
  splitTitle,
  timeLeft,
  type Notice,
} from "@/lib/arkiv"

export function Addr({ a, label }: { a: string; label?: string }) {
  return (
    <a
      href={`${EXPLORER}/address/${a}`}
      target="_blank"
      rel="noreferrer"
      className="break-all font-mono text-xs underline decoration-dotted underline-offset-2 hover:text-[var(--accent)]"
      title={a}
    >
      {label ?? short(a)}
    </a>
  )
}

export function TxLink({ hash }: { hash: string }) {
  return (
    <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer" className="font-mono text-xs underline">
      {short(hash)} ↗
    </a>
  )
}

export function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "accent" | "warn" | "ok" }) {
  const tones = {
    plain: "border-[var(--line)] text-[var(--muted)]",
    accent: "border-[var(--accent)] text-[var(--accent)]",
    warn: "border-[var(--warn)] text-[var(--warn)]",
    ok: "border-[var(--ok)] text-[var(--ok)]",
  }
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

const isAtRisk = (n: Notice, head: bigint) => n.expiresAt - head < blocksFromDays(AT_RISK_DAYS)

export function Expiry({ n, head }: { n: Notice; head: bigint | null }) {
  if (head === null) return <span className="text-xs text-[var(--muted)]">…</span>
  const atRisk = isAtRisk(n, head)
  return (
    <span className={`text-xs tabular-nums ${atRisk ? "font-semibold text-[var(--warn)]" : "text-[var(--muted)]"}`}>
      {atRisk ? "⚠ " : ""}expires in {timeLeft(n.expiresAt, head)}
    </span>
  )
}

/** Remaining lifetime against a fresh notice's {NOTICE_DAYS} days; preserved notices fill the bar. */
export function ExpiryBar({ n, head }: { n: Notice; head: bigint | null }) {
  const pct = head === null ? 0 : Math.max(2, Math.min(100, (Number(n.expiresAt - head) / Number(blocksFromDays(NOTICE_DAYS))) * 100))
  const atRisk = head !== null && isAtRisk(n, head)
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden>
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${atRisk ? "bg-[var(--warn)]" : "bg-[var(--ok)]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Expiry n={n} head={head} />
    </div>
  )
}

export const isSealed = (n: Notice) => n.owner.toLowerCase() === SEAL_ADDRESS.toLowerCase()

export function Title({ title, className = "" }: { title: string; className?: string }) {
  const t = splitTitle(title)
  return (
    <span className={className}>
      {t.text}
      {t.synthetic && (
        <span className="ml-2 inline-block translate-y-[-2px] rounded border border-[var(--line)] px-1 py-px align-middle font-sans text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
          synthetic
        </span>
      )}
    </span>
  )
}

export function NoticeCard({ n, head, fresh }: { n: Notice; head: bigint | null; fresh?: boolean }) {
  return (
    <Link
      href={`/notice/${n.key}`}
      className={`block rounded-xl border bg-[var(--card)] p-4 transition hover:border-[var(--ink)] active:scale-[.99] ${
        fresh ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-[var(--line)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
          {JURISDICTIONS[n.jurisdiction] ?? n.jurisdiction}
          <span className="font-normal text-[var(--muted)]"> · {n.requesterType}</span>
        </p>
        <div className="flex shrink-0 gap-1.5">
          {fresh && <Pill tone="accent">● new</Pill>}
          {isSealed(n) && <Pill tone="ok">🔒 sealed</Pill>}
        </div>
      </div>
      <h3 className="mt-1.5 font-serif text-[17px] leading-snug sm:text-lg">
        <Title title={n.payload.title} />
      </h3>
      <p className="mt-1.5 text-xs text-[var(--muted)]">
        {n.category} · {n.platform} · <span className="tabular-nums">{n.urlCount} URL{n.urlCount === 1 ? "" : "s"}</span> ·
        filed {fmtDate(n.filedAt)}
      </p>
      <div className="mt-3">
        <ExpiryBar n={n} head={head} />
      </div>
    </Link>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-label="Loading notices">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
          <div className="h-3 w-28 rounded bg-[var(--line)]" />
          <div className="mt-3 h-4 w-11/12 rounded bg-[var(--line)]" />
          <div className="mt-2 h-4 w-2/3 rounded bg-[var(--line)]" />
          <div className="mt-4 h-1.5 w-full rounded bg-[var(--line)]" />
        </div>
      ))}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent)] bg-[var(--card)] p-4 text-sm">
      <p>
        <span className="font-semibold text-[var(--accent)]">Couldn&apos;t reach Arkiv.</span> {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm">
          Try again
        </button>
      )}
    </div>
  )
}

export const fieldClass =
  "w-full rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-base text-[var(--ink)] sm:text-sm focus:border-[var(--ink)] focus:outline-none"

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--muted)]">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function LiveDot({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]" title="Arkiv entity events over WebSocket">
      <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-[var(--ok)]" : "bg-[var(--line)]"}`} />
      {live ? "live" : "offline"}
    </span>
  )
}
