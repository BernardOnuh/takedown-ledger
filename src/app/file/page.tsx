"use client"

import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { CATEGORIES, FAUCET, friendlyError, JURISDICTIONS, NOTICE_DAYS, REQUESTER_TYPES } from "@/lib/arkiv"
import { useWallet } from "@/lib/wallet"
import { fileNotice } from "@/lib/writes"
import { fieldClass, Select } from "@/components/ui"

const TEXT_FIELDS = [
  ["title", "Headline", "e.g. Order to block 40 protest accounts", false, 200],
  ["requester", "Requesting body (not a person)", "An organisation, e.g. telecom regulator", false, 200],
  ["legalBasis", "Legal basis cited", "The law or section the notice relies on", false, 200],
  ["summary", "What was demanded", "What the notice asked the platform to do", true, 1000],
  ["targetDescription", "Content targeted", "Describe the content, not the people behind it", true, 1000],
] as const

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
      <legend className="sr-only">{title}</legend>
      <h2 className="flex items-center gap-2 text-sm font-semibold" aria-hidden>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ink)] text-[11px] text-[var(--bg)]">{step}</span>
        {title}
      </h2>
      {children}
    </fieldset>
  )
}

export default function FilePage() {
  const router = useRouter()
  const { wallet, balance, wrongNetwork, connectBurner, openConnect, openSwitchNetwork } = useWallet()
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
  const empty = wallet && Number(balance ?? 0) < 0.01

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (wrongNetwork) return openSwitchNetwork()
    if (!wallet) return setErr("Connect a wallet first — the in-browser test wallet above works.")
    setBusy(true)
    setErr(null)
    try {
      const { entityKey, txHash } = await fileNotice(wallet, {
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
      router.push(`/notice/${entityKey}?filed=${txHash}`)
    } catch (e) {
      setErr(friendlyError(e))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-[28px] leading-tight sm:text-3xl">File a takedown notice</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted)] sm:text-sm">
          Received a demand to remove content? Put it on the record. Once filed it is <strong>readonly</strong> (no one can
          edit it), <strong>sealed</strong> (no one — including you — can delete it) and lives {NOTICE_DAYS} days unless
          people extend it.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--warn)] p-3 text-sm text-[var(--warn)]">
        <strong>Public and permanent.</strong> Don&apos;t include names of private individuals, contact details or anything
        that identifies a person. This demo is for synthetic data only.
      </div>

      {!wallet && !wrongNetwork && (
        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
          <p className="text-sm">
            <strong>You&apos;ll need a wallet to file.</strong>{" "}
            <span className="text-[var(--muted)]">No wallet? Use a throwaway test wallet that lives in this browser.</span>
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button onClick={connectBurner} className="rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--bg)]">
              Use test wallet
            </button>
            <button onClick={openConnect} className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold">
              Connect wallet
            </button>
          </div>
        </div>
      )}
      {wrongNetwork && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--accent)] bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">Your wallet is on another network. Notices are filed on Arkiv&apos;s Tiramisu testnet.</p>
          <button onClick={openSwitchNetwork} className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white">
            Switch to Tiramisu
          </button>
        </div>
      )}
      {empty && (
        <p className="rounded-xl border border-[var(--warn)] p-3 text-sm text-[var(--warn)]">
          Your wallet has no test GLM yet. Copy your address from the wallet menu (top right) into the{" "}
          <a className="underline" href={FAUCET} target="_blank" rel="noreferrer">Arkiv faucet ↗</a>, then come back.
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Section step={1} title="Where and who">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select label="Jurisdiction" value={f.jurisdiction} onChange={up("jurisdiction")}
              options={Object.entries(JURISDICTIONS).map(([value, label]) => ({ value, label }))} />
            <Select label="Requested by" value={f.requesterType} onChange={up("requesterType")}
              options={REQUESTER_TYPES.map((v) => ({ value: v, label: v }))} />
            <Select label="Category" value={f.category} onChange={up("category")}
              options={CATEGORIES.map((v) => ({ value: v, label: v }))} />
          </div>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
              Platform
              <input className={fieldClass} value={f.platform} onChange={(e) => up("platform")(e.target.value)} placeholder="X, YouTube…" required />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
              URLs targeted
              <input className={fieldClass} type="number" inputMode="numeric" min={1} value={f.urlCount} onChange={(e) => up("urlCount")(e.target.value)} required />
            </label>
          </div>
        </Section>

        <Section step={2} title="What was demanded">
          {TEXT_FIELDS.map(([k, label, ph, long, max]) => (
            <label key={k} className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
              <span className="flex justify-between">
                {label}
                {long && <span className="font-normal tabular-nums">{f[k].length}/{max}</span>}
              </span>
              {long ? (
                <textarea className={fieldClass} rows={3} value={f[k]} onChange={(e) => up(k)(e.target.value)} placeholder={ph} required maxLength={max} />
              ) : (
                <input className={fieldClass} value={f[k]} onChange={(e) => up(k)(e.target.value)} placeholder={ph} required maxLength={max} />
              )}
            </label>
          ))}
        </Section>

        {err && <p className="rounded-xl border border-[var(--accent)] p-3 text-sm text-[var(--accent)]">{err}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 font-semibold text-white disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Filing and sealing… confirm in your wallet" : wallet ? "File and seal on Arkiv" : "Connect a wallet to file"}
        </button>
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          One atomic transaction: create the readonly entity, then hand its ownership to 0x…dEaD using its predicted key.
        </p>
      </form>
    </div>
  )
}
