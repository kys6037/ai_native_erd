import { useEffect, useRef, useState } from 'react'
import type { ErdData } from '../types/erd'

interface CollabUser {
  userId: number
  userName: string
}

interface UseCollaborationReturn {
  connected: boolean
  users: CollabUser[]
  syncToYjs: (data: ErdData) => void
}

export function useCollaboration(
  projectId: number | null,
  token: string | null,
  onRemoteUpdate: (data: ErdData) => void
): UseCollaborationReturn {
  const [connected, setConnected] = useState(false)
  const [users, setUsers] = useState<CollabUser[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const onRemoteUpdateRef = useRef(onRemoteUpdate)

  // Keep ref up to date so the ws.onmessage closure always calls the latest callback
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
        if (msg.erdData) {
          onRemoteUpdateRef.current(msg.erdData)
        }
      } else if (msg.type === 'erd_sync') {
        onRemoteUpdateRef.current(msg.data)
      } else if (msg.type === 'user_joined') {
        setUsers((u) => [...u.filter((x) => x.userId !== msg.userId), { userId: msg.userId, userName: msg.userName }])
      } else if (msg.type === 'user_left') {
        setUsers((u) => u.filter((x) => x.userId !== msg.userId))
      }
    }

    ws.onclose = () => {
      setConnected(false)
    }

    return () => {
      ws.close()
      setConnected(false)
      setUsers([])
    }
  }, [projectId, token])

  const syncToYjs = (data: ErdData) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: 'erd_sync', data }))
  }

  return { connected, users, syncToYjs }
}
