import { createPublicClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { and, eq, gte, lt } from "@arkiv-network/sdk/query"
import type { Expression } from "@arkiv-network/sdk/query"
import { key, u64 } from "@arkiv-network/sdk/attr"
import { http, webSocket, type Hex } from "viem"

/** Every entity this app writes carries this tag, so our queries never see other apps' data. */
export const APP = "takedown-ledger-v1"

/** Tiramisu produces a block every 2 seconds; expiries are block heights. */
export const BLOCK_SECONDS = 2
export const blocksFromDays = (days: number) => BigInt(Math.round((days * 86400) / BLOCK_SECONDS))

/** Lifetimes per entity type — see /arkiv/schema.md for the reasoning. */
export const NOTICE_DAYS = 90
export const OUTCOME_DAYS = 180
export const PRESERVE_DAYS = 30
export const AT_RISK_DAYS = 14

/** Owner of every sealed notice. No one holds this key, so no one can delete a sealed notice. */
export const SEAL_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const

export const EXPLORER = "https://tiramisu.explorer.arkiv.network"
export const FAUCET = "https://hub.arkiv.network/faucet"

export const publicClient = createPublicClient({ chain: tiramisu, transport: http() })

/** A separate WebSocket client so watchEntityEvents opens a real subscription instead of polling. */
let ws: ReturnType<typeof makeWs> | undefined
const makeWs = () => createPublicClient({ chain: tiramisu, transport: webSocket() })
export const wsClient = () => (ws ??= makeWs())

export const JURISDICTIONS: Record<string, string> = {
  IN: "India",
  TR: "Türkiye",
  RU: "Russia",
  BR: "Brazil",
  US: "United States",
  DE: "Germany",
  NG: "Nigeria",
  ID: "Indonesia",
  PK: "Pakistan",
  GB: "United Kingdom",
  OTHER: "Other",
}
export const REQUESTER_TYPES = ["government", "court", "police", "corporate", "individual"] as const
export const CATEGORIES = [
  "political-speech",
  "journalism",
  "copyright",
  "defamation",
  "national-security",
  "protest",
  "other",
] as const
export const OUTCOMES = ["complied", "refused", "partially-complied", "challenged", "reinstated"] as const

export type NoticePayload = {
  title: string
  requester: string
  legalBasis: string
  summary: string
  targetDescription: string
}

export type Notice = {
  key: Hex
  creator: Hex
  owner: Hex
  expiresAt: bigint
  createdAt: bigint
  permissionlessExtension: boolean
  readonly: boolean
  jurisdiction: string
  requesterType: string
  category: string
  platform: string
  filedAt: number
  urlCount: number
  payload: NoticePayload
}

export type Outcome = {
  key: Hex
  creator: Hex
  expiresAt: bigint
  notice: Hex
  outcome: string
  filedAt: number
  note: string
}

type RawEntity = {
  key?: Hex
  creator?: Hex
  owner?: Hex
  expiresAt?: bigint
  createdAt?: bigint
  creationFlags?: { readonly: boolean; permissionlessExtension: boolean }
  attributes?: Readonly<Record<string, { type: string; value: unknown }>>
  payload?: Uint8Array
}

const attr = (e: RawEntity, name: string) => e.attributes?.[name]?.value
const str = (e: RawEntity, name: string) => String(attr(e, name) ?? "")
const num = (e: RawEntity, name: string) => Number(attr(e, name) ?? 0)
const json = <T>(e: RawEntity, fallback: T): T => {
  try {
    return e.payload ? (JSON.parse(new TextDecoder().decode(e.payload)) as T) : fallback
  } catch {
    return fallback
  }
}

export function toNotice(e: RawEntity): Notice | null {
  if (attr(e, "app") !== APP || attr(e, "type") !== "notice" || !e.key) return null
  return {
    key: e.key,
    creator: e.creator!,
    owner: e.owner!,
    expiresAt: e.expiresAt ?? 0n,
    createdAt: e.createdAt ?? 0n,
    permissionlessExtension: !!e.creationFlags?.permissionlessExtension,
    readonly: !!e.creationFlags?.readonly,
    jurisdiction: str(e, "jurisdiction"),
    requesterType: str(e, "requester_type"),
    category: str(e, "category"),
    platform: str(e, "platform"),
    filedAt: num(e, "filed_at"),
    urlCount: num(e, "url_count"),
    payload: json<NoticePayload>(e, {
      title: "(unreadable payload)",
      requester: "",
      legalBasis: "",
      summary: "",
      targetDescription: "",
    }),
  }
}

export function toOutcome(e: RawEntity): Outcome | null {
  if (attr(e, "app") !== APP || attr(e, "type") !== "outcome" || !e.key) return null
  return {
    key: e.key,
    creator: e.creator!,
    expiresAt: e.expiresAt ?? 0n,
    notice: str(e, "notice") as Hex,
    outcome: str(e, "outcome"),
    filedAt: num(e, "filed_at"),
    note: json<{ note: string }>(e, { note: "" }).note,
  }
}

export type NoticeFilters = {
  jurisdiction?: string
  category?: string
  requesterType?: string
  minUrls?: number
  sinceDays?: number
}

/** Builds the compound predicate for the feed. Every filter is an indexed attribute, not payload. */
export function noticePredicate(f: NoticeFilters = {}): Expression {
  const parts: Expression[] = [eq("app", APP), eq("type", "notice")]
  if (f.jurisdiction) parts.push(eq("jurisdiction", f.jurisdiction))
  if (f.category) parts.push(eq("category", f.category))
  if (f.requesterType) parts.push(eq("requester_type", f.requesterType))
  if (f.minUrls) parts.push(gte("url_count", f.minUrls))
  if (f.sinceDays) {
    const since = Math.floor(Date.now() / 1000) - f.sinceDays * 86400
    parts.push(gte("filed_at", u64(since)))
  }
  return and(parts)
}

const MAX_PAGES = 10

/** Walks cursor pages (200 per page) and sorts client-side — the engine has no ORDER BY. */
export async function fetchNotices(f: NoticeFilters = {}, creator?: Hex): Promise<Notice[]> {
  let q = publicClient.select().where(noticePredicate(f)).limit(200)
  if (creator) q = q.createdBy(creator)
  const out: Notice[] = []
  let page = await q.fetch()
  for (let i = 0; ; i++) {
    for (const e of page.entities) {
      const n = toNotice(e as RawEntity)
      if (n) out.push(n)
    }
    if (!page.hasNextPage() || i >= MAX_PAGES) break
    page = await page.next()
  }
  return out.sort((a, b) => b.filedAt - a.filedAt)
}

/** Notices whose Entity Expiration falls within the window — the "preserve these" list. */
export async function fetchAtRisk(head: bigint): Promise<Notice[]> {
  const res = await publicClient
    .select()
    .where(
      and(eq("app", APP), eq("type", "notice"), lt("$expiresAt", u64(head + blocksFromDays(AT_RISK_DAYS)))),
    )
    .limit(50)
    .fetch()
  return res.entities
    .map((e) => toNotice(e as RawEntity))
    .filter((n): n is Notice => !!n)
    .sort((a, b) => Number(a.expiresAt - b.expiresAt))
}

export async function fetchNotice(key: Hex): Promise<Notice | null> {
  try {
    return toNotice((await publicClient.getEntity(key)) as RawEntity)
  } catch {
    return null
  }
}

export async function fetchOutcomes(notice: Hex): Promise<Outcome[]> {
  const res = await publicClient
    .select()
    .where(and(eq("app", APP), eq("type", "outcome"), eq("notice", key(notice))))
    .limit(200)
    .fetch()
  return res.entities
    .map((e) => toOutcome(e as RawEntity))
    .filter((o): o is Outcome => !!o)
    .sort((a, b) => a.filedAt - b.filedAt)
}

export function timeLeft(expiresAt: bigint, head: bigint): string {
  const secs = Number(expiresAt - head) * BLOCK_SECONDS
  if (secs <= 0) return "expired"
  const days = Math.floor(secs / 86400)
  if (days >= 1) return `${days}d ${Math.floor((secs % 86400) / 3600)}h`
  const hours = Math.floor(secs / 3600)
  return hours >= 1 ? `${hours}h ${Math.floor((secs % 3600) / 60)}m` : `${Math.ceil(secs / 60)}m`
}

export const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`
export const fmtDate = (unix: number) =>
  new Date(unix * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
