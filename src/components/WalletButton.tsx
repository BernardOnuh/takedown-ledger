"use client"

import { useState, type ReactNode } from "react"
import { FAUCET, friendlyError } from "@/lib/arkiv"
import { useWallet } from "@/lib/wallet"
import { Addr } from "./ui"

const item = "w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-left text-sm hover:border-[var(--ink)]"

/** Dropdown anchored to the button; a full-screen backdrop closes it on outside taps. */
function Menu({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <>
      <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 text-xs shadow-xl">
        {children}
      </div>
    </>
  )
}

export function WalletButton() {
  const { address, mode, balance, hasInjected, connectInjected, connectBurner, disconnect, refreshBalance } = useWallet()
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const close = () => setOpen(false)

  if (address) {
    const empty = Number(balance ?? 0) < 0.01
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 font-mono text-xs"
        >
          <span className={`h-2 w-2 rounded-full ${empty ? "bg-[var(--warn)]" : "bg-[var(--ok)]"}`} />
          {address.slice(0, 6)}…{address.slice(-4)}
          <span className="hidden text-[var(--muted)] sm:inline">· {balance ?? "…"} GLM</span>
        </button>
        {open && (
          <Menu onClose={close}>
            <p className="mb-1 font-medium text-[var(--muted)]">
              {mode === "burner" ? "In-browser test wallet" : "Browser wallet"} · {balance ?? "…"} GLM
            </p>
            <p className="mb-3">
              <Addr a={address} label={address} />
            </p>
            {empty && (
              <p className="mb-3 rounded-lg border border-[var(--warn)] p-2 text-[var(--warn)]">
                Needs test GLM to write.{" "}
                <button onClick={() => navigator.clipboard?.writeText(address)} className="underline">
                  Copy address
                </button>
                , then paste it into the{" "}
                <a href={FAUCET} target="_blank" rel="noreferrer" className="underline">
                  Arkiv faucet ↗
                </a>
                .
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={refreshBalance} className={item}>
                Refresh balance
              </button>
              <button
                onClick={() => {
                  disconnect()
                  close()
                }}
                className={item}
              >
                Disconnect
              </button>
            </div>
          </Menu>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full bg-[var(--ink)] px-4 py-1.5 text-xs font-semibold text-[var(--bg)]"
      >
        Connect
      </button>
      {open && (
        <Menu onClose={close}>
          <p className="mb-3 text-[var(--muted)]">
            Reading needs no wallet. Filing and preserving need free test GLM on Arkiv&apos;s Tiramisu testnet.
          </p>
          <div className="space-y-2">
            {hasInjected && (
              <button
                onClick={async () => {
                  try {
                    await connectInjected()
                    close()
                  } catch (e) {
                    setErr(friendlyError(e))
                  }
                }}
                className={item}
              >
                <span className="font-medium">Browser wallet</span>
                <span className="block text-xs text-[var(--muted)]">MetaMask or similar</span>
              </button>
            )}
            <button
              onClick={() => {
                connectBurner()
                close()
              }}
              className={item}
            >
              <span className="font-medium">In-browser test wallet</span>
              <span className="block text-xs text-[var(--muted)]">No extension needed. Testnet only.</span>
            </button>
          </div>
          {err && <p className="mt-2 text-[var(--accent)]">{err}</p>}
        </Menu>
      )}
    </div>
  )
}
