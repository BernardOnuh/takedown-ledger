/** One-off: seal notices filed before sealing existed (moves ownership to SEAL_ADDRESS in one batch). */
import { config } from "dotenv"
import { createWalletClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { http, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { fetchNotices, SEAL_ADDRESS } from "../src/lib/arkiv"
config({ path: ".env.local" })
const account = privateKeyToAccount(process.env.ARKIV_PRIVATE_KEY as Hex)
const wallet = createWalletClient({ chain: tiramisu, transport: http(), account })
const mine = (await fetchNotices({}, account.address)).filter((n) => n.owner.toLowerCase() === account.address.toLowerCase())
if (!mine.length) { console.log("nothing to seal"); process.exit(0) }
const res = await wallet.executeBatch({ ownershipChanges: mine.map((n) => ({ entityKey: n.key, newOwner: SEAL_ADDRESS })) })
console.log(`sealed ${res.ownershipChanges.length} notices in one batch, tx ${res.txHash}`)
