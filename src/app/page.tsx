"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AT_RISK_DAYS,
  CATEGORIES,
  fetchAtRisk,
  fetchNotice,
  fetchNotices,
  friendlyError,
  JURISDICTIONS,
  matchesFilters,
  REQUESTER_TYPES,
  timeLeft,
  type Notice,
  type NoticeFilters,
} from "@/lib/arkiv"
import { useHead, useLiveEvents } from "@/lib/hooks"
import { CardSkeleton, ErrorBox, LiveDot, NoticeCard, Select, Title } from "@/components/ui"

const any = { value: "", label: "Any" }

const SCALE = [any, { value: "10", label: "≥ 10 URLs" }, { value: "50", label: "≥ 50 URLs" }, { value: "100", label: "≥ 100 URLs" }]
const SINCE = [{ value: "", label: "Any time" }, { value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }]

/** Human labels for the active-filter chips. */
function chipLabel(k: keyof NoticeFilters, v: string | number): string {
  if (k === "jurisdiction") return JURISDICTIONS[v] ?? String(v)
  if (k === "minUrls") return `≥ ${v} URLs`
  if (k === "sinceDays") return `Last ${v} days`
  return String(v)
}

const GUARANTEES = [
  ["🔒", "Readonly", "No one can edit a notice once it's filed."],
  ["⛓", "Sealed", "Ownership goes to 0x…dEaD, so no one can delete it."],
  ["⏳", "Kept alive by anyone", "Anyone can extend a notice's life. No one can shorten it."],
] as const

export default function LedgerPage() {
  const head = useHead()
  const [filters, setFilters] = useState<NoticeFilters>({})
  const [notices, setNotices] = useState<Notice[] | null>(null)
  const [atRisk, setAtRisk] = useState<Notice[]>([])
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    fetchNotices(filters)
      .then((n) => alive && (setNotices(n), setError(null)))
      .catch((e) => alive && setError(friendlyError(e)))
    return () => {
      alive = false
    }
  }, [filters, attempt])

  useEffect(() => {
    if (head !== null) fetchAtRisk(head).then(setAtRisk).catch(() => {})
    // Recompute only occasionally; the head ticks every 10s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [head === null, notices])

  const live = useLiveEvents({
    onCreated: async (e) => {
      // Notices are the only entities we create with both flags, so skip the lookup for everything else.
      if (!e.creationFlags.readonly || !e.creationFlags.permissionlessExtension) return
      const n = await fetchNotice(e.entityKey)
      if (!n) return // someone else's app
      if (!matchesFilters(n, filters)) return
      setNotices((cur) => (cur && !cur.some((c) => c.key === n.key) ? [n, ...cur] : cur))
      setFresh((s) => new Set(s).add(n.key))
    },
    onExtended: (e) => {
      // Extensions arrive for every app on the chain; keep the same array unless one of ours moved, or the
      // at-risk effect (which depends on `notices`) would re-query on every foreign event.
      const bump = (list: Notice[]) =>
        list.some((n) => n.key === e.entityKey)
          ? list.map((n) => (n.key === e.entityKey ? { ...n, expiresAt: e.expiresAt } : n))
          : list
      setNotices((cur) => cur && bump(cur))
      setAtRisk(bump)
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
  const active = (Object.entries(filters) as [keyof NoticeFilters, string | number | undefined][]).filter(([, v]) => v)

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Censorship resistance · on Arkiv</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight sm:text-4xl">
          Every demand to take something down, <span className="text-[var(--accent)]">kept on the record.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)] sm:text-base">
          A public ledger of takedown notices. Once filed, a notice can&apos;t be edited or deleted — not by the filer, not
          by us. Anyone can keep it alive.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex">
          <Link href="/file" className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-semibold text-white">
            File a notice
          </Link>
          <Link href="/about" className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-4 py-2.5 text-center text-sm font-semibold">
            How it works
          </Link>
        </div>
        <ul className="mt-6 grid gap-2 sm:grid-cols-3">
          {GUARANTEES.map(([icon, title, body]) => (
            <li key={title} className="flex gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
              <span className="text-lg leading-none" aria-hidden>{icon}</span>
              <span className="text-sm">
                <span className="font-semibold">{title}.</span>{" "}
                <span className="text-[var(--muted)]">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {(
          [
            ["Notices", stats.count, false],
            ["URLs targeted", stats.urls, false],
            ["By state actors", stats.gov, false],
            ["Expiring soon", atRisk.length, atRisk.length > 0],
          ] as const
        ).map(([label, v, warn]) => (
          <div key={label} className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
            <div className={`text-2xl font-semibold tabular-nums ${warn ? "text-[var(--warn)]" : ""}`}>
              {notices ? v : error ? "—" : <span className="inline-block h-6 w-10 animate-pulse rounded bg-[var(--line)] align-middle" />}
            </div>
            <div className="text-xs text-[var(--muted)]">{label}</div>
          </div>
        ))}
      </section>

      {atRisk.length > 0 && (
        <section className="rounded-xl border border-[var(--warn)] bg-[var(--card)] p-4">
          <h2 className="font-semibold text-[var(--warn)]">⚠ Expiring soon — help keep these on the record</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Less than {AT_RISK_DAYS} days left. Open one and tap <strong>Preserve</strong>; no permission needed.
          </p>
          <ul className="mt-3 divide-y divide-[var(--line)]">
            {atRisk.map((n) => (
              <li key={n.key}>
                <Link href={`/notice/${n.key}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Title title={n.payload.title} className="min-w-0 flex-1 underline-offset-2 hover:underline" />
                  <span className="shrink-0 rounded-full bg-[var(--warn)]/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--warn)]">
                    {head ? timeLeft(n.expiresAt, head) : "…"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">
            The ledger
            {notices && <span className="ml-2 font-sans text-sm text-[var(--muted)] tabular-nums">{notices.length}</span>}
          </h2>
          <div className="flex items-center gap-3">
            <LiveDot live={live} />
            <button
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
              className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium sm:hidden"
            >
              Filters{active.length > 0 && <span className="ml-1 text-[var(--accent)]">({active.length})</span>}
            </button>
          </div>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} grid-cols-2 gap-3 rounded-xl border border-[var(--line)] p-3 sm:grid sm:grid-cols-5 sm:border-0 sm:p-0`}>
          <Select label="Jurisdiction" value={filters.jurisdiction ?? ""} onChange={set("jurisdiction")}
            options={[any, ...Object.entries(JURISDICTIONS).map(([value, label]) => ({ value, label }))]} />
          <Select label="Requested by" value={filters.requesterType ?? ""} onChange={set("requesterType")}
            options={[any, ...REQUESTER_TYPES.map((v) => ({ value: v, label: v }))]} />
          <Select label="Category" value={filters.category ?? ""} onChange={set("category")}
            options={[any, ...CATEGORIES.map((v) => ({ value: v, label: v }))]} />
          <Select label="Scale" value={String(filters.minUrls ?? "")} onChange={set("minUrls")} options={SCALE} />
          <Select label="Filed" value={String(filters.sinceDays ?? "")} onChange={set("sinceDays")} options={SINCE} />
        </div>

        {active.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {active.map(([k, v]) => (
              <button
                key={k}
                onClick={() => set(k)("")}
                className="rounded-full border border-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent)]"
                aria-label={`Remove filter ${chipLabel(k, v!)}`}
              >
                {chipLabel(k, v!)} ✕
              </button>
            ))}
            <button onClick={() => setFilters({})} className="px-1 text-xs text-[var(--muted)] underline">
              Clear all
            </button>
          </div>
        ) : (
          stats.top.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-xs [scrollbar-width:none]">
              <span className="shrink-0 py-1 text-[var(--muted)]">Most notices:</span>
              {stats.top.map(([j, c]) => (
                <button
                  key={j}
                  onClick={() => set("jurisdiction")(j)}
                  className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1 hover:border-[var(--ink)]"
                >
                  {JURISDICTIONS[j] ?? j} <span className="text-[var(--muted)]">{c}</span>
                </button>
              ))}
            </div>
          )
        )}

        {error && <ErrorBox message={error} onRetry={() => (setError(null), setAttempt((a) => a + 1))} />}
        {!notices && !error && <CardSkeleton />}
        {notices?.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
            No notices match these filters.{" "}
            <button onClick={() => setFilters({})} className="underline">
              Clear filters
            </button>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {notices?.map((n) => <NoticeCard key={n.key} n={n} head={head} fresh={fresh.has(n.key)} />)}
        </div>
      </section>
    </div>
  )
}
