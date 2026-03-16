import { useEffect, useRef, useState } from 'react'
import type { ErdData } from '../types/erd'

export interface CollabUser {
  userId: number
  userName: string
}

interface UseCollaborationReturn {
  connected: boolean
  users: CollabUser[]
  tableFocuses: Record<string, CollabUser[]>
  syncToYjs: (data: ErdData) => void
  focusTable: (tableId: string | null) => void
}

export function useCollaboration(
  projectId: number | null,
  token: string | null,
  onRemoteUpdate: (data: ErdData) => void
): UseCollaborationReturn {
  const [connected, setConnected] = useState(false)
  const [users, setUsers] = useState<CollabUser[]>([])
  const [tableFocuses, setTableFocuses] = useState<Record<string, CollabUser[]>>({})
  const wsRef = useRef<WebSocket | null>(null)
  const onRemoteUpdateRef = useRef(onRemoteUpdate)

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate
  })

  useEffect(() => {
    if (!projectId || !token) return

    const backendUrl = import.meta.env.VITE_API_BASE_URL || ''
    const wsUrl = backendUrl
      ? `${backendUrl.replace(/^http/, 'ws')}/ws/collab/${projectId}`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/collab/${projectId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token }))
    }

    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return
      const msg = JSON.parse(event.data)

      if (msg.type === 'auth_ok') {
        setConnected(true)
        if (msg.erdData) onRemoteUpdateRef.current(msg.erdData)
      } else if (msg.type === 'erd_sync') {
        onRemoteUpdateRef.current(msg.data)
      } else if (msg.type === 'user_joined') {
        setUsers((u) => [...u.filter((x) => x.userId !== msg.userId), { userId: msg.userId, userName: msg.userName }])
      } else if (msg.type === 'user_left') {
        setUsers((u) => u.filter((x) => x.userId !== msg.userId))
        setTableFocuses((prev) => {
          const next: Record<string, CollabUser[]> = {}
          for (const tid of Object.keys(prev)) {
            const filtered = prev[tid].filter((u) => u.userId !== msg.userId)
            if (filtered.length > 0) next[tid] = filtered
          }
          return next
        })
      } else if (msg.type === 'table_focus') {
        const { tableId, userId, userName } = msg as { tableId: string | null; userId: number; userName: string }
        setTableFocuses((prev) => {
          const next: Record<string, CollabUser[]> = {}
          // Remove this user from all tables first
          for (const tid of Object.keys(prev)) {
            const filtered = prev[tid].filter((u) => u.userId !== userId)
            if (filtered.length > 0) next[tid] = filtered
          }
          // Add to new table if provided
          if (tableId) {
            next[tableId] = [...(next[tableId] ?? []), { userId, userName }]
          }
          return next
        })
      }
    }

    ws.onclose = () => {
      setConnected(false)
      setTableFocuses({})
    }

    return () => {
      ws.close()
      setConnected(false)
      setUsers([])
      setTableFocuses({})
    }
  }, [projectId, token])

  const syncToYjs = (data: ErdData) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'erd_sync', data }))
  }

  const focusTable = (tableId: string | null) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'table_focus', tableId }))
  }

  return { connected, users, tableFocuses, syncToYjs, focusTable }
}
