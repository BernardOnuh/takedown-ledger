/** Proves the two on-chain guarantees: notices are immutable, and anyone can extend them. */
import { config } from "dotenv"
import { createWalletClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { jsonToPayload } from "@arkiv-network/sdk/utils"
import { http, parseEther, type Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { fetchNotices, publicClient, wsClient, short } from "../src/lib/arkiv"
import { preserveNotice } from "../src/lib/writes"

config({ path: ".env.local" })
const filer = createWalletClient({ chain: tiramisu, transport: http(), account: privateKeyToAccount(process.env.ARKIV_PRIVATE_KEY as Hex) })
const target = (await fetchNotices()).find((n) => n.jurisdiction === "BR")!

const events: string[] = []
const unwatch = wsClient().watchEntityEvents({
  onExpiryExtended: (e) => events.push(`ExpiryExtended ${short(e.entityKey)}`),
  onError: (e) => events.push(`ws error ${e.message}`),
})

// 1. The filer (current owner) tries to rewrite the notice.
try {
  await filer.patchEntity({ entityKey: target.key, payload: jsonToPayload({ title: "rewritten" }), contentType: "application/json", attributes: { app: "x" } } as never)
  console.log("1) PATCH SUCCEEDED — readonly NOT enforced")
} catch (e) {
  console.log("1) patch by owner rejected:", (e as Error).message.split("\n")[0])
}

// 2. A stranger with no relationship to the notice extends it.
const strangerKey = generatePrivateKey()
const stranger = createWalletClient({ chain: tiramisu, transport: http(), account: privateKeyToAccount(strangerKey) })
const fund = await filer.sendTransaction({ to: stranger.account.address, value: parseEther("0.2") })
await publicClient.waitForTransactionReceipt({ hash: fund })
const before = target.expiresAt
const res = await preserveNotice(stranger, target)
const after = (await publicClient.getEntity(target.key)).expiresAt
console.log(`2) stranger ${short(stranger.account.address)} extended ${short(target.key)}: ${before} -> ${after} (tx ${res.txHash})`)

await new Promise((r) => setTimeout(r, 6000))
console.log("3) websocket events seen:", events)
unwatch()
process.exit(0)
