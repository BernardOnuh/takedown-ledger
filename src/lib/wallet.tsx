"use client"

import "@rainbow-me/rainbowkit/styles.css"
import {
  connectorsForWallets,
  darkTheme,
  lightTheme,
  RainbowKitProvider,
  useChainModal,
  useConnectModal,
} from "@rainbow-me/rainbowkit"
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets"
import { createWalletClient, type WalletArkivClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { custom, formatEther, http, type Address, type EIP1193Provider, type Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createConfig, useAccount, useDisconnect, WagmiProvider } from "wagmi"
import { publicClient } from "./arkiv"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Wallet = WalletArkivClient<any, any, any>
type Mode = "external" | "burner"

/**
 * Browser-extension wallets are discovered automatically (EIP-6963). Mobile wallets over WalletConnect need
 * a free project id from https://cloud.reown.com; without one we only list wallets that don't need it.
 */
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
const connectors = connectorsForWallets(
  projectId
    ? [{ groupName: "Popular", wallets: [metaMaskWallet, rabbyWallet, rainbowWallet, walletConnectWallet] }]
    : [{ groupName: "Browser wallets", wallets: [injectedWallet, rabbyWallet] }],
  { appName: "Takedown Ledger", projectId: projectId ?? "" },
)

const wagmiConfig = createConfig({
  chains: [tiramisu],
  connectors,
  transports: { [tiramisu.id]: http() },
  ssr: true,
})

const queryClient = new QueryClient()

const ACCENT = { accentColor: "#b42318", accentColorForeground: "#ffffff", borderRadius: "medium" } as const
const theme = { lightMode: lightTheme(ACCENT), darkMode: darkTheme({ ...ACCENT, accentColor: "#f97066" }) }

type WalletState = {
  wallet: Wallet | null
  address: Address | null
  mode: Mode | null
  balance: string | null
  /** An external wallet is connected but on another chain; writes are blocked until it switches. */
  wrongNetwork: boolean
  openConnect: () => void
  openSwitchNetwork: () => void
  connectBurner: () => void
  disconnect: () => void
  refreshBalance: () => Promise<void>
}

const Ctx = createContext<WalletState | null>(null)
// A throwaway testnet key kept only in this browser, for judges without a browser wallet.
const BURNER_KEY = "takedown-ledger:burner"

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
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme} initialChain={tiramisu} appInfo={{ appName: "Takedown Ledger" }}>
          <ArkivWallet>{children}</ArkivWallet>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

/** Bridges whichever wallet is active (RainbowKit/wagmi or the burner) into an Arkiv wallet client. */
function ArkivWallet({ children }: { children: ReactNode }) {
  const account = useAccount()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { openChainModal } = useChainModal()
  const [burner, setBurner] = useState<Wallet | null>(null)
  // Keyed by address so a stale client is ignored after a disconnect or account switch, without an effect reset.
  const [linked, setLinked] = useState<{ address: Address; wallet: Wallet } | null>(null)
  const [balance, setBalance] = useState<string | null>(null)

  const wrongNetwork = !burner && account.isConnected && account.chainId !== tiramisu.id

  useEffect(() => {
    const { address, connector, isConnected } = account
    if (!isConnected || !address || !connector) return
    let alive = true
    connector
      .getProvider()
      .then((provider) => {
        if (!alive) return
        setLinked({
          address,
          wallet: createWalletClient({ chain: tiramisu, transport: custom(provider as EIP1193Provider), account: address }) as Wallet,
        })
        setBurner(null) // connecting a real wallet replaces the test wallet
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.address, account.connector, account.isConnected])

  const external = account.isConnected && linked && linked.address === account.address ? linked.wallet : null
  const active = burner ?? (wrongNetwork ? null : external)
  const mode: Mode | null = burner ? "burner" : external ? "external" : null
  const address = (burner?.account?.address ?? (account.isConnected ? account.address : undefined) ?? null) as Address | null

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

  const connectBurner = useCallback(() => {
    if (account.isConnected) wagmiDisconnect()
    let pk = safeStorage.get(BURNER_KEY) as Hex | null
    if (!pk) {
      pk = generatePrivateKey()
      safeStorage.set(BURNER_KEY, pk)
    }
    setBurner(createWalletClient({ chain: tiramisu, transport: http(), account: privateKeyToAccount(pk) }) as Wallet)
  }, [account.isConnected, wagmiDisconnect])

  const disconnect = useCallback(() => {
    setBurner(null)
    if (account.isConnected) wagmiDisconnect()
  }, [account.isConnected, wagmiDisconnect])

  return (
    <Ctx.Provider
      value={{
        wallet: active,
        address,
        mode,
        balance,
        wrongNetwork,
        openConnect: () => openConnectModal?.(),
        openSwitchNetwork: () => openChainModal?.(),
        connectBurner,
        disconnect,
        refreshBalance,
      }}
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
