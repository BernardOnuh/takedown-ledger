import { tiramisu } from "@arkiv-network/sdk/chains"

/**
 * Read-only JSON-RPC relay that adds our Arkiv API key server-side. Browsers read Arkiv directly on their
 * own anonymous budget and only fall back here once it's exhausted, so the key's monthly quota is shared
 * by as few requests as possible and never ships to the client.
 */
const READ_METHODS = new Set([
  "arkiv_query",
  "arkiv_getBlockTiming",
  "arkiv_getEntityCount",
  "eth_blockNumber",
  "eth_chainId",
  "eth_getBalance",
  "eth_getTransactionCount",
  "eth_call",
])

type RpcCall = { jsonrpc: "2.0"; id: number | string | null; method: string; params?: unknown }

const reject = (id: RpcCall["id"], message: string) => ({ jsonrpc: "2.0", id, error: { code: -32601, message } })

export async function POST(request: Request) {
  const key = process.env.ARKIV_API_KEY
  if (!key) return Response.json(reject(null, "relay not configured"), { status: 503 })

  let body: RpcCall | RpcCall[]
  try {
    body = await request.json()
  } catch {
    return Response.json(reject(null, "invalid JSON"), { status: 400 })
  }
  const calls = Array.isArray(body) ? body : [body]
  if (calls.length === 0 || calls.length > 20) return Response.json(reject(null, "batch size 1–20"), { status: 400 })
  const bad = calls.find((c) => !READ_METHODS.has(c?.method))
  if (bad) return Response.json(reject(bad?.id ?? null, `method not allowed: ${bad?.method}`), { status: 403 })

  const upstream = await fetch(tiramisu.rpcUrls.default.http[0], {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify(body),
  })
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  })
}
