"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import type { Hex } from "viem"
import { fetchNotices, type Notice } from "@/lib/arkiv"
import { useHead } from "@/lib/hooks"
import { Addr, CardSkeleton, NoticeCard } from "@/components/ui"

export default function FilerPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Querying Arkiv…</p>}>
      <FilerView />
    </Suspense>
  )
}

function FilerView() {
  const { addr } = useParams<{ addr: Hex }>()
  const head = useHead()
  const [notices, setNotices] = useState<Notice[] | null>(null)

  useEffect(() => {
    fetchNotices({}, addr).then(setNotices).catch(() => setNotices([]))
  }, [addr])

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-block py-1 text-sm text-[var(--muted)] hover:text-[var(--ink)]">← Back to ledger</Link>
      <h1 className="font-serif text-2xl">
        Filed by
        <span className="mt-1 block text-base">
          <Addr a={addr} label={addr} />
        </span>
      </h1>
      <p className="text-sm text-[var(--muted)]">
        Query: <code className="font-mono">createdBy({addr.slice(0, 8)}…)</code>. <code className="font-mono">$creator</code> is
        immutable, so this list can&apos;t be forged — even for sealed notices this wallet no longer owns.
      </p>
      {!notices && <CardSkeleton count={2} />}
      {notices?.length === 0 && <p className="text-sm text-[var(--muted)]">No notices from this address.</p>}
      <div className="grid gap-3 md:grid-cols-2">{notices?.map((n) => <NoticeCard key={n.key} n={n} head={head} />)}</div>
    </div>
  )
}
