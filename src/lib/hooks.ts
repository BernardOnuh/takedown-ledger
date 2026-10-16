"use client"

import { useEffect, useRef, useState } from "react"
import type { EntityCreatedEvent, ExpiryExtendedEvent } from "@arkiv-network/sdk"
import { publicClient, wsClient } from "./arkiv"

/** Current block height, refreshed every 10s. Expiries are block heights, so countdowns need it. */
export function useHead() {
  const [head, setHead] = useState<bigint | null>(null)
  useEffect(() => {
    let alive = true
    const tick = () => publicClient.getBlockNumber().then((b) => alive && setHead(b)).catch(() => {})
    tick()
    const id = setInterval(tick, 10_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  return head
}

type LiveHandlers = {
  onCreated?: (e: EntityCreatedEvent) => void
  onExtended?: (e: ExpiryExtendedEvent) => void
}

/**
 * Subscribes to Arkiv entity events over WebSocket (no fromBlock, so it is a real subscription,
 * not polling). Returns whether the socket is live, for the UI indicator.
 */
export function useLiveEvents(handlers: LiveHandlers) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })
  const [live, setLive] = useState(false)
  useEffect(() => {
    let alive = true
    const client = wsClient()
    const unwatch = client.watchEntityEvents({
      onEntityCreated: (e) => ref.current.onCreated?.(e),
      onExpiryExtended: (e) => ref.current.onExtended?.(e),
      onError: () => alive && setLive(false),
    })
    // A round-trip over the same socket proves the subscription's transport is up.
    client
      .getBlockNumber()
      .then(() => alive && setLive(true))
      .catch(() => alive && setLive(false))
    return () => {
      alive = false
      unwatch()
    }
  }, [])
  return live
}
