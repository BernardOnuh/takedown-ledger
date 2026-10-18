"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  CATEGORIES,
  fetchAtRisk,
  fetchNotice,
  fetchNotices,
  JURISDICTIONS,
  matchesFilters,
  REQUESTER_TYPES,
  timeLeft,
  type Notice,
  type NoticeFilters,
} from "@/lib/arkiv"
import { useHead, useLiveEvents } from "@/lib/hooks"
import { LiveDot, NoticeCard, Select } from "@/components/ui"

const any = { value: "", label: "Any" }

export default function LedgerPage() {
  const head = useHead()
  const [filters, setFilters] = useState<NoticeFilters>({})
  const [notices, setNotices] = useState<Notice[] | null>(null)
  const [atRisk, setAtRisk] = useState<Notice[]>([])
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchNotices(filters)
      .then((n) => alive && (setNotices(n), setError(null)))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [filters])

  useEffect(() => {
    if (head !== null) fetchAtRisk(head).then(setAtRisk).catch(() => {})
    // Recompute only occasionally; the head ticks every 10s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [head === null, notices])

  const live = useLiveEvents({
    onCreated: async (e) => {
      const n = await fetchNotice(e.entityKey)
      if (!n) return // someone else's app, or an outcome
      if (!matchesFilters(n, filters)) return
      setNotices((cur) => (cur && !cur.some((c) => c.key === n.key) ? [n, ...cur] : cur))
      setFresh((s) => new Set(s).add(n.key))
    },
    onExtended: (e) => {
      setNotices((cur) => cur?.map((n) => (n.key === e.entityKey ? { ...n, expiresAt: e.expiresAt } : n)) ?? cur)
      setAtRisk((cur) => cur.map((n) => (n.key === e.entityKey ? { ...n, expiresAt: e.expiresAt } : n)))
    },
  })

  const stats = useMemo(() => {
    const list = notices ?? []
    const byJur = new Map<string, number>()
    for (const n of list) byJur.set(n.jurisdiction, (byJur.get(n.jurisdiction) ?? 0) + 1)
    return {
      count: list.length,
      urls: list.reduce((s, n) => s + n.urlCount, 0),
      gov: list.filter((n) => ["government", "court", "police"].includes(n.requesterType)).length,
      top: [...byJur.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    }
  }, [notices])

  const set = (k: keyof NoticeFilters) => (v: string) =>
    setFilters((f) => ({ ...f, [k]: k === "minUrls" || k === "sinceDays" ? Number(v) || undefined : v || undefined }))

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
          Every demand to take something down, <span className="text-[var(--accent)]">kept on the record.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Takedown notices filed here are stored as Arkiv entities: readonly, sealed so no one can delete them, and
          extendable by anyone who thinks they matter. No operator — including us — can quietly remove one.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Notices", stats.count],
          ["URLs targeted", stats.urls],
          ["By state actors", stats.gov],
          ["At risk of expiring", atRisk.length],
        ].map(([label, v]) => (
          <div key={label} className="rounded-lg border border-[var(--line)] bg-[var(--card)] p-3">
            <div className="text-2xl font-semibold tabular-nums">{notices ? v : "…"}</div>
            <div className="text-xs text-[var(--muted)]">{label}</div>
          </div>
        ))}
      </section>

      {atRisk.length > 0 && (
        <section className="rounded-lg border border-[var(--warn)] bg-[var(--card)] p-4">
          <h2 className="font-semibold text-[var(--warn)]">⚠ Expiring soon — anyone can preserve these</h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Query: <code className="font-mono">$expiresAt &lt; head + 14 days</code>. Open one and press Preserve to extend
            it; no permission needed.
          </p>
          <ul className="space-y-1 text-sm">
            {atRisk.map((n) => (
              <li key={n.key} className="flex flex-wrap justify-between gap-2">
                <Link href={`/notice/${n.key}`} className="underline">{n.payload.title}</Link>
                <span className="tabular-nums text-[var(--warn)]">{head ? timeLeft(n.expiresAt, head) : "…"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Jurisdiction" value={filters.jurisdiction ?? ""} onChange={set("jurisdiction")}
            options={[any, ...Object.entries(JURISDICTIONS).map(([value, label]) => ({ value, label }))]} />
          <Select label="Requested by" value={filters.requesterType ?? ""} onChange={set("requesterType")}
            options={[any, ...REQUESTER_TYPES.map((v) => ({ value: v, label: v }))]} />
          <Select label="Category" value={filters.category ?? ""} onChange={set("category")}
            options={[any, ...CATEGORIES.map((v) => ({ value: v, label: v }))]} />
          <Select label="Scale" value={String(filters.minUrls ?? "")} onChange={set("minUrls")}
            options={[any, { value: "10", label: "≥ 10 URLs" }, { value: "50", label: "≥ 50 URLs" }, { value: "100", label: "≥ 100 URLs" }]} />
          <Select label="Filed" value={String(filters.sinceDays ?? "")} onChange={set("sinceDays")}
            options={[{ value: "", label: "Any time" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }]} />
          <div className="ml-auto"><LiveDot live={live} /></div>
        </div>

        {stats.top.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            Most notices:{" "}
            {stats.top.map(([j, c]) => (
              <button key={j} onClick={() => set("jurisdiction")(j)} className="underline">
                {JURISDICTIONS[j] ?? j} ({c})
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-[var(--accent)]">Couldn&apos;t reach Arkiv: {error}</p>}
        {!notices && !error && <p className="text-sm text-[var(--muted)]">Querying Arkiv…</p>}
        {notices?.length === 0 && <p className="text-sm text-[var(--muted)]">No notices match these filters.</p>}
        <div className="grid gap-3">
          {notices?.map((n) => <NoticeCard key={n.key} n={n} head={head} fresh={fresh.has(n.key)} />)}
        </div>
      </section>
    </div>
  )
}
