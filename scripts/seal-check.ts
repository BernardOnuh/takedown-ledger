/** Files one sealed notice, then shows that even its filer can no longer delete it. */
import { config } from "dotenv"
import { createWalletClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { http, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { fetchNotice, short } from "../src/lib/arkiv"
import { fileNotice } from "../src/lib/writes"
config({ path: ".env.local" })
const wallet = createWalletClient({ chain: tiramisu, transport: http(), account: privateKeyToAccount(process.env.ARKIV_PRIVATE_KEY as Hex) })
const { entityKey, txHash } = await fileNotice(wallet, {
  jurisdiction: "OTHER", requesterType: "government", category: "journalism", platform: "Mastodon", urlCount: 5,
  payload: {
    title: "[SYNTHETIC] Order to suspend 5 accounts of an exiled news outlet",
    requester: "Synthetic interior ministry",
    legalBasis: "Foreign agents law (as cited in notice)",
    summary: "Demand that a federated instance suspend accounts of an outlet operating in exile.",
    targetDescription: "5 accounts on a single instance.",
  },
})
const n = await fetchNotice(entityKey)
console.log(`filed ${short(entityKey)} tx ${txHash}\n creator ${n?.creator}\n owner   ${n?.owner}`)
try {
  await wallet.deleteEntity({ entityKey })
  console.log("DELETE SUCCEEDED — seal NOT effective")
} catch (e) {
  console.log("delete by filer rejected:", (e as Error).message.split("\n")[0])
}
