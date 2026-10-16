"use client"

import { useState } from "react"
import { FAUCET } from "@/lib/arkiv"
import { useWallet } from "@/lib/wallet"
import { Addr } from "./ui"

export function WalletButton() {
  const { address, mode, balance, hasInjected, connectInjected, connectBurner, disconnect, refreshBalance } = useWallet()
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (address) {
    return (
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="rounded-md border border-[var(--line)] px-2.5 py-1 font-mono text-xs">
          {address.slice(0, 6)}…{address.slice(-4)} · {balance ?? "…"} GLM
        </button>
        {open && (
          <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-[var(--line)] bg-[var(--card)] p-3 text-xs shadow-lg">
            <p className="mb-1 text-[var(--muted)]">{mode === "burner" ? "In-browser test wallet" : "Browser wallet"}</p>
            <p className="mb-2"><Addr a={address} label={address} /></p>
            {Number(balance ?? 0) < 0.01 && (
              <p className="mb-2 text-[var(--warn)]">
                Needs test GLM to write. Copy the address above into the{" "}
                <a href={FAUCET} target="_blank" rel="noreferrer" className="underline">Arkiv faucet</a>.
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={refreshBalance} className="rounded border border-[var(--line)] px-2 py-1">Refresh balance</button>
              <button onClick={() => { disconnect(); setOpen(false) }} className="rounded border border-[var(--line)] px-2 py-1">Disconnect</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-md bg-[var(--ink)] px-3 py-1 text-xs font-medium text-[var(--bg)]">
        Connect
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-[var(--line)] bg-[var(--card)] p-3 text-xs shadow-lg">
          <p className="mb-2 text-[var(--muted)]">Reading needs no wallet. Writing (filing, preserving) needs test GLM on Tiramisu.</p>
          {hasInjected && (
            <button
              onClick={async () => {
                try { await connectInjected(); setOpen(false) } catch (e) { setErr((e as Error).message) }
              }}
              className="mb-2 w-full rounded border border-[var(--line)] px-2 py-1.5 text-left"
            >
              Browser wallet (MetaMask etc.)
            </button>
          )}
          <button onClick={() => { connectBurner(); setOpen(false) }} className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-left">
            In-browser test wallet <span className="text-[var(--muted)]">— no extension needed</span>
          </button>
          {err && <p className="mt-2 text-[var(--accent)]">{err}</p>}
        </div>
      )}
    </div>
  )
}
