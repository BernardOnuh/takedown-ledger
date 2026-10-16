/**
 * Read-only reproduction of every query the app runs. No key needed: npm run verify
 */
import { publicClient, fetchNotices, fetchAtRisk, fetchOutcomes, short, timeLeft } from "../src/lib/arkiv"

const head = await publicClient.getBlockNumber()
console.log("head block", head)

const all = await fetchNotices()
console.log(`\n1) all notices: ${all.length}`)
for (const n of all) console.log(`   ${short(n.key)} ${n.jurisdiction} ${n.category.padEnd(17)} urls=${String(n.urlCount).padStart(3)} expires in ${timeLeft(n.expiresAt, head)}  flags ro=${n.readonly} pe=${n.permissionlessExtension}`)

const big = await fetchNotices({ minUrls: 20 })
console.log(`\n2) url_count >= 20: ${big.length} ->`, big.map((n) => n.jurisdiction).join(","))

const recentGov = await fetchNotices({ requesterType: "government", sinceDays: 14 })
console.log(`3) government, last 14 days: ${recentGov.length} ->`, recentGov.map((n) => n.jurisdiction).join(","))

const risk = await fetchAtRisk(head)
console.log(`4) $expiresAt within 14 days (at risk): ${risk.length} ->`, risk.map((n) => `${n.jurisdiction} ${timeLeft(n.expiresAt, head)}`).join(", "))

if (all[0]) {
  const creator = all[0].creator
  const mine = await fetchNotices({}, creator)
  console.log(`5) createdBy(${short(creator)}): ${mine.length}`)
  const withOutcome = all.find((n) => n.jurisdiction === "TR") ?? all[0]
  const outs = await fetchOutcomes(withOutcome.key)
  console.log(`6) outcomes for ${short(withOutcome.key)}:`, outs.map((o) => `${o.outcome} by ${short(o.creator)}`).join("; "))
}
