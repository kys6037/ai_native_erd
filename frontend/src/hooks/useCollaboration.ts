import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
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
  const ydocRef = useRef<Y.Doc | null>(null)

  useEffect(() => {
    if (!projectId || !token) return

    const ydoc = new Y.Doc()
    ydocRef.current = ydoc
    const yTables = ydoc.getMap('tables')
    const yRelationships = ydoc.getMap('relationships')

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/collab/${projectId}`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token }))
    }

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data)
        if (msg.type === 'auth_ok') {
          setConnected(true)
        } else if (msg.type === 'user_joined') {
          setUsers((u) => [...u.filter((x) => x.userId !== msg.userId), { userId: msg.userId, userName: msg.userName }])
        } else if (msg.type === 'user_left') {
          setUsers((u) => u.filter((x) => x.userId !== msg.userId))
        }
      } else {
        // Binary: Yjs update from remote
        const update = new Uint8Array(event.data as ArrayBuffer)
        Y.applyUpdate(ydoc, update, 'remote')
      }
    }

    ws.onclose = () => {
      setConnected(false)
    }

    // Yjs local changes → send to server
    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(update)
      }
    })

    // Yjs → ERD state (remote updates only)
    const updateFromYjs = (_event: unknown, transaction: Y.Transaction) => {
      if (transaction.origin === 'local') return
      const tables = [...yTables.values()] as ErdData['tables']
      const relationships = [...yRelationships.values()] as ErdData['relationships']
      if (tables.length > 0 || relationships.length > 0) {
        onRemoteUpdate({ tables, relationships })
      }
    }
    yTables.observe(updateFromYjs)
    yRelationships.observe(updateFromYjs)

    return () => {
      ws.close()
      ydoc.destroy()
      setConnected(false)
      setUsers([])
    }
  }, [projectId, token])

  const syncToYjs = (data: ErdData) => {
    const ydoc = ydocRef.current
    if (!ydoc) return
    const yTables = ydoc.getMap('tables')
    const yRelationships = ydoc.getMap('relationships')
    ydoc.transact(() => {
      // Update tables
      const currentTableIds = new Set([...yTables.keys()])
      const newTableIds = new Set(data.tables.map((t) => t.id))
      currentTableIds.forEach((id) => { if (!newTableIds.has(id)) yTables.delete(id) })
      data.tables.forEach((t) => yTables.set(t.id, t))
      // Update relationships
      const currentRelIds = new Set([...yRelationships.keys()])
      const newRelIds = new Set(data.relationships.map((r) => r.id))
      currentRelIds.forEach((id) => { if (!newRelIds.has(id)) yRelationships.delete(id) })
      data.relationships.forEach((r) => yRelationships.set(r.id, r))
    }, 'local')
  }

  return { connected, users, syncToYjs }
}
