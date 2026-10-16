"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import {
  AT_RISK_DAYS,
  blocksFromDays,
  EXPLORER,
  fmtDate,
  JURISDICTIONS,
  SEAL_ADDRESS,
  short,
  timeLeft,
  type Notice,
} from "@/lib/arkiv"

export function Addr({ a, label }: { a: string; label?: string }) {
  return (
    <a
      href={`${EXPLORER}/address/${a}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs underline decoration-dotted underline-offset-2 hover:text-[var(--accent)]"
      title={a}
    >
      {label ?? short(a)}
    </a>
  )
}

export function TxLink({ hash }: { hash: string }) {
  return (
    <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer" className="font-mono text-xs underline">
      {short(hash)}
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
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Expiry({ n, head }: { n: Notice; head: bigint | null }) {
  if (head === null) return <span className="text-xs text-[var(--muted)]">…</span>
  const atRisk = n.expiresAt - head < blocksFromDays(AT_RISK_DAYS)
  return (
    <span className={`text-xs tabular-nums ${atRisk ? "font-semibold text-[var(--warn)]" : "text-[var(--muted)]"}`}>
      {atRisk ? "⚠ " : ""}expires in {timeLeft(n.expiresAt, head)}
    </span>
  )
}

export const isSealed = (n: Notice) => n.owner.toLowerCase() === SEAL_ADDRESS.toLowerCase()

export function NoticeCard({ n, head, fresh }: { n: Notice; head: bigint | null; fresh?: boolean }) {
  return (
    <Link
      href={`/notice/${n.key}`}
      className={`block rounded-lg border bg-[var(--card)] p-4 transition hover:border-[var(--ink)] ${
        fresh ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-[var(--line)]"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Pill tone="accent">{JURISDICTIONS[n.jurisdiction] ?? n.jurisdiction}</Pill>
        <Pill>{n.requesterType}</Pill>
        <Pill>{n.category}</Pill>
        {isSealed(n) && <Pill tone="ok">sealed</Pill>}
        {fresh && <Pill tone="accent">● just filed</Pill>}
      </div>
      <h3 className="font-serif text-lg leading-snug">{n.payload.title}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        <span>{n.platform}</span>
        <span className="tabular-nums">{n.urlCount} URL{n.urlCount === 1 ? "" : "s"}</span>
        <span>filed {fmtDate(n.filedAt)}</span>
        <Expiry n={n} head={head} />
      </div>
    </Link>
  )
}

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
    <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--line)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--ink)]"
      >
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
