import type { WalletArkivClient } from "@arkiv-network/sdk"
import { key, u64 } from "@arkiv-network/sdk/attr"
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils"
import type { Hex } from "viem"
import {
  APP,
  blocksFromDays,
  NOTICE_DAYS,
  OUTCOME_DAYS,
  PRESERVE_DAYS,
  publicClient,
  SEAL_ADDRESS,
  type NoticePayload,
} from "./arkiv"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Wallet = WalletArkivClient<any, any, any>

export type NewNotice = {
  jurisdiction: string
  requesterType: string
  category: string
  platform: string
  urlCount: number
  filedAt?: number
  /** Only the seed script overrides this, to simulate notices filed weeks ago. */
  lifetimeDays?: number
  payload: NoticePayload
}

/**
 * A notice is created `readonly` (nobody, including its filer, can rewrite what was demanded) and
 * with `permissionlessExtension` (anyone can keep it alive). In the same atomic batch its ownership
 * moves to SEAL_ADDRESS, which nobody holds a key for, so nobody — not even a filer under pressure —
 * can delete it early. Its key is predicted up front so the transfer can name it.
 */
export async function fileNotice(wallet: Wallet, n: NewNotice) {
  const [{ key: entityKey, salt }] = await publicClient.predictEntityKeys({
    owner: wallet.account.address,
    count: 1,
  })
  const create = {
    attributes: {
      app: APP,
      type: "notice",
      jurisdiction: n.jurisdiction,
      requester_type: n.requesterType,
      category: n.category,
      platform: n.platform,
      url_count: n.urlCount,
      filed_at: u64(n.filedAt ?? Math.floor(Date.now() / 1000)),
    },
    payload: jsonToPayload(n.payload),
    contentType: "application/json",
    expires: ExpirationTime.fromDays(n.lifetimeDays ?? NOTICE_DAYS),
    flags: { readonly: true, permissionlessExtension: true },
    salt,
  }
  const res = await wallet.executeBatch({
    creates: [create],
    ownershipChanges: [{ entityKey, newOwner: SEAL_ADDRESS }],
  })
  if (res.createdEntities[0] !== entityKey) {
    throw new Error(`predicted ${entityKey} but created ${res.createdEntities[0]}`)
  }
  return { entityKey, txHash: res.txHash }
}

/**
 * Records what happened to a notice. If the notice would expire before its outcome does, the same
 * atomic batch extends the notice, so an outcome never outlives the request it answers.
 */
export async function fileOutcome(
  wallet: Wallet,
  notice: { key: Hex; expiresAt: bigint },
  outcome: string,
  note: string,
  { keepNoticeAlive = true } = {},
) {
  const head = await publicClient.getBlockNumber()
  const outcomeExpiry = head + blocksFromDays(OUTCOME_DAYS)
  const create = {
    attributes: {
      app: APP,
      type: "outcome",
      notice: key(notice.key),
      outcome,
      filed_at: u64(Math.floor(Date.now() / 1000)),
    },
    payload: jsonToPayload({ note }),
    contentType: "application/json",
    expires: ExpirationTime.fromDays(OUTCOME_DAYS),
    flags: { readonly: true },
  }
  // A small margin so the notice still outlives the outcome after a few blocks of drift.
  const extendTo = outcomeExpiry + 300n
  const extensions =
    keepNoticeAlive && notice.expiresAt < extendTo
      ? [{ entityKey: notice.key, expires: ExpirationTime.atBlock(extendTo) }]
      : []
  return wallet.executeBatch({ creates: [create], extensions })
}

/** Anyone can push a notice's expiry later. Extensions set a new absolute expiry, never shorten. */
export async function preserveNotice(wallet: Wallet, notice: { key: Hex; expiresAt: bigint }) {
  return wallet.extendEntity({
    entityKey: notice.key,
    expires: ExpirationTime.atBlock(notice.expiresAt + blocksFromDays(PRESERVE_DAYS)),
  })
}
