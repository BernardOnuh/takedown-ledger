"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { CATEGORIES, FAUCET, JURISDICTIONS, NOTICE_DAYS, REQUESTER_TYPES } from "@/lib/arkiv"
import { useWallet } from "@/lib/wallet"
import { fileNotice } from "@/lib/writes"
import { Select } from "@/components/ui"

const field = "w-full rounded-md border border-[var(--line)] bg-[var(--card)] px-2 py-1.5 text-sm"

export default function FilePage() {
  const router = useRouter()
  const { wallet, balance } = useWallet()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [f, setF] = useState({
    jurisdiction: "IN",
    requesterType: "government",
    category: "political-speech",
    platform: "",
    urlCount: "1",
    title: "",
    requester: "",
    legalBasis: "",
    summary: "",
    targetDescription: "",
  })
  const up = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet) return setErr("Connect a wallet first (top right).")
    setBusy(true)
    setErr(null)
    try {
      const { entityKey } = await fileNotice(wallet, {
        jurisdiction: f.jurisdiction,
        requesterType: f.requesterType,
        category: f.category,
        platform: f.platform.trim() || "unspecified",
        urlCount: Math.max(1, Math.floor(Number(f.urlCount) || 1)),
        payload: {
          title: f.title.trim(),
          requester: f.requester.trim(),
          legalBasis: f.legalBasis.trim(),
          summary: f.summary.trim(),
          targetDescription: f.targetDescription.trim(),
        },
      })
      router.push(`/notice/${entityKey}`)
    } catch (e) {
      setErr((e as Error).message.split("\n")[0])
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl">File a takedown notice</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Received a demand to remove content? Put it on the record. Once filed, the notice is{" "}
          <strong>readonly</strong> (no one can edit it), <strong>sealed</strong> (no one — including you — can delete
          it) and lives {NOTICE_DAYS} days unless the community extends it.
        </p>
        <p className="mt-2 rounded-md border border-[var(--warn)] p-2 text-xs text-[var(--warn)]">
          Everything here is public and permanent for its lifetime. Do not include names of private individuals,
          contact details or anything that identifies a person. This demo is for synthetic data only.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Select label="Jurisdiction" value={f.jurisdiction} onChange={up("jurisdiction")}
            options={Object.entries(JURISDICTIONS).map(([value, label]) => ({ value, label }))} />
          <Select label="Requested by" value={f.requesterType} onChange={up("requesterType")}
            options={REQUESTER_TYPES.map((v) => ({ value: v, label: v }))} />
          <Select label="Category" value={f.category} onChange={up("category")}
            options={CATEGORIES.map((v) => ({ value: v, label: v }))} />
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            Platform
            <input className={field} value={f.platform} onChange={(e) => up("platform")(e.target.value)} placeholder="X, YouTube…" required />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            URLs targeted
            <input className={field} type="number" min={1} value={f.urlCount} onChange={(e) => up("urlCount")(e.target.value)} required />
          </label>
        </div>
        {(
          [
            ["title", "Headline", "e.g. Order to block 40 accounts reporting on a protest", false],
            ["requester", "Requesting body (organisation, not a person)", "e.g. National telecom regulator", false],
            ["legalBasis", "Legal basis cited", "Law / section the notice relies on", false],
            ["summary", "What was demanded", "", true],
            ["targetDescription", "Content targeted", "Describe the content, not the people behind it", true],
          ] as const
        ).map(([k, label, ph, long]) => (
          <label key={k} className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            {label}
            {long ? (
              <textarea className={field} rows={3} value={f[k]} onChange={(e) => up(k)(e.target.value)} placeholder={ph} required maxLength={1000} />
            ) : (
              <input className={field} value={f[k]} onChange={(e) => up(k)(e.target.value)} placeholder={ph} required maxLength={200} />
            )}
          </label>
        ))}

        {err && <p className="text-sm text-[var(--accent)]">{err}</p>}
        {wallet && Number(balance ?? 0) < 0.01 && (
          <p className="text-sm text-[var(--warn)]">
            Your wallet has no test GLM. Get some from the <a className="underline" href={FAUCET} target="_blank" rel="noreferrer">faucet</a>.
          </p>
        )}
        <button disabled={busy} className="rounded-md bg-[var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-50">
          {busy ? "Filing and sealing…" : wallet ? "File and seal on Arkiv" : "Connect a wallet to file"}
        </button>
        <p className="text-xs text-[var(--muted)]">
          One atomic batch: create the readonly entity, then transfer ownership to 0x…dEaD using its predicted key.
        </p>
      </form>
    </div>
  )
}
