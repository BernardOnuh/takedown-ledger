"use client"

import { createWalletClient, type WalletArkivClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { custom, formatEther, http, type Address, type EIP1193Provider, type Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { publicClient } from "./arkiv"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Wallet = WalletArkivClient<any, any, any>
type Mode = "injected" | "burner"

type WalletState = {
  wallet: Wallet | null
  address: Address | null
  mode: Mode | null
  balance: string | null
  hasInjected: boolean
  connectInjected: () => Promise<void>
  connectBurner: () => void
  disconnect: () => void
  refreshBalance: () => Promise<void>
}

const noopSubscribe = () => () => {}

const Ctx = createContext<WalletState | null>(null)
// A throwaway testnet key kept only in this browser, for judges without a browser wallet.
const BURNER_KEY = "takedown-ledger:burner"

declare global {
  interface Window {
    ethereum?: EIP1193Provider
  }
}

const safeStorage = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {}
  },
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [mode, setMode] = useState<Mode | null>(null)
  const [balance, setBalance] = useState<string | null>(null)

  const hasInjected = useSyncExternalStore(
    noopSubscribe,
    () => !!window.ethereum,
    () => false,
  )

  const address = (wallet?.account?.address as Address | undefined) ?? null

  const refreshBalance = useCallback(async () => {
    if (!address) return setBalance(null)
    const wei = await publicClient.getBalance({ address })
    setBalance(Number(formatEther(wei)).toFixed(3))
  }, [address])

  useEffect(() => {
    if (!address) return
    let alive = true
    publicClient
      .getBalance({ address })
      .then((wei) => alive && setBalance(Number(formatEther(wei)).toFixed(3)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [address])

  const connectInjected = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) throw new Error("No browser wallet found")
    const chainId = `0x${tiramisu.id.toString(16)}` as Hex
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] })
    } catch {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId,
            chainName: tiramisu.name,
            nativeCurrency: tiramisu.nativeCurrency,
            rpcUrls: [...tiramisu.rpcUrls.default.http],
            blockExplorerUrls: ["https://tiramisu.explorer.arkiv.network"],
          },
        ],
      })
    }
    const [account] = await eth.request({ method: "eth_requestAccounts" })
    setWallet(createWalletClient({ chain: tiramisu, transport: custom(eth), account }) as Wallet)
    setMode("injected")
  }, [])

  const connectBurner = useCallback(() => {
    let pk = safeStorage.get(BURNER_KEY) as Hex | null
    if (!pk) {
      pk = generatePrivateKey()
      safeStorage.set(BURNER_KEY, pk)
    }
    setWallet(
      createWalletClient({ chain: tiramisu, transport: http(), account: privateKeyToAccount(pk) }) as Wallet,
    )
    setMode("burner")
  }, [])

  const disconnect = useCallback(() => {
    setWallet(null)
    setMode(null)
  }, [])

  return (
    <Ctx.Provider
      value={{ wallet, address, mode, balance, hasInjected, connectInjected, connectBurner, disconnect, refreshBalance }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useWallet() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useWallet outside WalletProvider")
  return v
}
