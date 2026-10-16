/**
 * Seeds Tiramisu with SYNTHETIC takedown notices and outcomes. No real people, no real notices.
 * Usage: ARKIV_PRIVATE_KEY=0x... npm run seed   (or put the key in .env.local)
 */
import { config } from "dotenv"
import { createWalletClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { http, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { fetchNotice } from "../src/lib/arkiv"
import { fileNotice, fileOutcome, type NewNotice } from "../src/lib/writes"

config({ path: ".env.local" })
const pk = process.env.ARKIV_PRIVATE_KEY as Hex | undefined
if (!pk) throw new Error("Set ARKIV_PRIVATE_KEY (testnet only) in .env.local")

const wallet = createWalletClient({ chain: tiramisu, transport: http(), account: privateKeyToAccount(pk) })
const daysAgo = (d: number) => Math.floor(Date.now() / 1000) - d * 86400

type Seed = NewNotice & { outcome?: [string, string] }

const seeds: Seed[] = [
  {
    jurisdiction: "TR", requesterType: "court", category: "journalism", platform: "X", urlCount: 37, filedAt: daysAgo(41),
    payload: {
      title: "[SYNTHETIC] Court order to withhold 37 posts about a municipal contract",
      requester: "Synthetic Criminal Judgeship of Peace No. 4",
      legalBasis: "Article 8/A of the internet law (as cited in notice)",
      summary: "Order demands withholding of posts reporting on a contested public procurement award.",
      targetDescription: "37 posts by 6 journalist accounts linking to an investigative article.",
    },
    outcome: ["partially-complied", "Platform withheld 22 posts in-country; challenged the remaining 15."],
  },
  {
    jurisdiction: "IN", requesterType: "government", category: "protest", platform: "X", urlCount: 112, filedAt: daysAgo(12),
    payload: {
      title: "[SYNTHETIC] Blocking order for 112 accounts during farmer protests",
      requester: "Synthetic Ministry of Electronics — blocking committee",
      legalBasis: "Section 69A blocking rules (as cited in notice)",
      summary: "Confidential blocking order covering accounts that shared protest logistics and live video.",
      targetDescription: "112 accounts, including 9 news outlets and 2 opposition politicians' staff.",
    },
    outcome: ["challenged", "Recipient filed a writ petition challenging the order's proportionality."],
  },
  {
    jurisdiction: "RU", requesterType: "government", category: "political-speech", platform: "YouTube", urlCount: 4, filedAt: daysAgo(80),
    lifetimeDays: 10,
    payload: {
      title: "[SYNTHETIC] Regulator demand to remove 4 videos on anti-war rallies",
      requester: "Synthetic federal communications regulator",
      legalBasis: "Law on information, Art. 15.3 (as cited in notice)",
      summary: "Demand to remove videos labelled as 'calls to unsanctioned mass events'.",
      targetDescription: "4 videos from an independent media channel, ~2.1M combined views.",
    },
    outcome: ["refused", "Recipient refused; service throttled in-country two days later."],
  },
  {
    jurisdiction: "US", requesterType: "corporate", category: "copyright", platform: "GitHub", urlCount: 1, filedAt: daysAgo(6),
    payload: {
      title: "[SYNTHETIC] DMCA notice against an open-source download tool",
      requester: "Synthetic recording-industry trade association",
      legalBasis: "17 U.S.C. § 1201 anti-circumvention (as cited in notice)",
      summary: "Claims the repository's primary purpose is circumventing technical protection measures.",
      targetDescription: "1 repository and its 1,200+ forks.",
    },
    outcome: ["reinstated", "Repository reinstated after counter-notice and removal of test fixtures."],
  },
  {
    jurisdiction: "BR", requesterType: "court", category: "political-speech", platform: "Telegram", urlCount: 8, filedAt: daysAgo(3),
    payload: {
      title: "[SYNTHETIC] Electoral court order to remove 8 channels before a run-off",
      requester: "Synthetic regional electoral court",
      legalBasis: "Electoral resolution on disinformation (as cited in notice)",
      summary: "Order to remove channels accused of coordinated electoral disinformation.",
      targetDescription: "8 public channels with a combined 340k subscribers.",
    },
  },
  {
    jurisdiction: "NG", requesterType: "police", category: "protest", platform: "Instagram", urlCount: 15, filedAt: daysAgo(77),
    lifetimeDays: 6,
    payload: {
      title: "[SYNTHETIC] Police request to remove footage of a protest crackdown",
      requester: "Synthetic state police command",
      legalBasis: "Cybercrimes act, s.24 (as cited in notice)",
      summary: "Informal request citing 'incitement' for videos documenting arrests at a protest.",
      targetDescription: "15 posts and reels from citizen journalists.",
    },
    outcome: ["refused", "Request lacked a court order; content kept up with a sensitive-content screen."],
  },
  {
    jurisdiction: "DE", requesterType: "individual", category: "defamation", platform: "Google Search", urlCount: 3, filedAt: daysAgo(20),
    payload: {
      title: "[SYNTHETIC] Delisting request for 3 articles about a business executive",
      requester: "Synthetic law firm on behalf of an unnamed client",
      legalBasis: "Right to be forgotten / GDPR Art. 17 (as cited in notice)",
      summary: "Request to delist news coverage of a fraud trial in which the client was acquitted.",
      targetDescription: "3 news URLs from regional newspapers.",
    },
    outcome: ["complied", "Delisted for name searches within the EU only."],
  },
  {
    jurisdiction: "ID", requesterType: "government", category: "national-security", platform: "TikTok", urlCount: 56, filedAt: daysAgo(9),
    payload: {
      title: "[SYNTHETIC] Ministry demand to remove 56 videos on a regional independence movement",
      requester: "Synthetic ministry of communication and informatics",
      legalBasis: "Ministerial regulation on private electronic systems (as cited in notice)",
      summary: "24-hour removal demand classifying the videos as 'urgent' prohibited content.",
      targetDescription: "56 videos, mostly footage of peaceful flag-raising events.",
    },
  },
  {
    jurisdiction: "PK", requesterType: "government", category: "political-speech", platform: "X", urlCount: 23, filedAt: daysAgo(1),
    payload: {
      title: "[SYNTHETIC] Telecom authority order against posts critical of an election result",
      requester: "Synthetic national telecom authority",
      legalBasis: "Removal and blocking of unlawful online content rules (as cited in notice)",
      summary: "Order demanding removal of posts alleging vote-count manipulation.",
      targetDescription: "23 posts, including 4 from a former legislator.",
    },
  },
  {
    jurisdiction: "GB", requesterType: "corporate", category: "journalism", platform: "Substack", urlCount: 2, filedAt: daysAgo(15),
    payload: {
      title: "[SYNTHETIC] Legal threat to remove an investigation into a mining company",
      requester: "Synthetic reputation-management firm",
      legalBasis: "Defamation Act 2013 (as cited in letter)",
      summary: "Letter threatening suit unless two investigative posts are removed within 7 days.",
      targetDescription: "2 posts from an independent investigative newsletter.",
    },
    outcome: ["refused", "Publisher declined; letter published alongside the article."],
  },
]

console.log("Filing as", wallet.account.address)
for (const s of seeds) {
  const { outcome, ...notice } = s
  const { entityKey, txHash } = await fileNotice(wallet, notice)
  console.log("notice ", entityKey, txHash, notice.payload.title)
  if (outcome) {
    const fresh = await fetchNotice(entityKey)
    if (!fresh) throw new Error(`notice ${entityKey} not readable after create`)
    // Short-lived demo notices keep their short life so the "at risk" list has something in it.
    const res = await fileOutcome(wallet, fresh, outcome[0], outcome[1], {
      keepNoticeAlive: !notice.lifetimeDays,
    })
    console.log("outcome", res.createdEntities[0], outcome[0], "extended:", res.extendedEntities.length)
  }
}
console.log("done")
