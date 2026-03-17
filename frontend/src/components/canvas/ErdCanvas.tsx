import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnNodesChange,
  type OnEdgesChange,
  type ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import TableNode, { type TableNodeType } from './TableNode'
import useErdStore from '../../stores/erdStore'
import useThemeStore from '../../stores/themeStore'
import useSelectionStore from '../../stores/selectionStore'
import type { ErdTable, ErdRelationship } from '../../types/erd'
import type { CollabUser } from '../../hooks/useCollaboration'

const nodeTypes = { tableNode: TableNode }

interface Props {
  onSelectTable: (table: ErdTable | null) => void
  tableFocuses: Record<string, CollabUser[]>
  focusTable: (tableId: string | null) => void
}

function erdToNodes(
  tables: ErdTable[],
  tableFocuses: Record<string, CollabUser[]>,
  selectedIds: Set<string>
): Node[] {
  return tables.map((t) => ({
    id: t.id,
    type: 'tableNode',
    position: { x: t.x, y: t.y },
    draggable: selectedIds.has(t.id),
    selected: selectedIds.has(t.id),
    data: { ...t, _focusedBy: tableFocuses[t.id] ?? [] } as TableNodeType['data'],
  }))
}

function erdToEdges(relationships: ErdRelationship[]): Edge[] {
  return relationships.map((r) => ({
    id: r.id,
    source: r.sourceTableId,
    target: r.targetTableId,
    sourceHandle: `${r.sourceTableId}__${r.sourceColumnName}__source`,
    targetHandle: `${r.targetTableId}__${r.targetColumnName}__target`,
    type: 'smoothstep',
    animated: false,
    label: r.type === 'one-to-many' ? '1:N' : r.type === 'one-to-one' ? '1:1' : 'N:M',
    style: { stroke: '#6366f1', strokeWidth: 2 },
  }))
}

export default function ErdCanvas({ onSelectTable, tableFocuses, focusTable }: Props) {
  const { present, moveTable, addRelationship, removeRelationship, removeItems } = useErdStore()
  const theme = useThemeStore((s) => s.theme)
  const { selectTable, setEditingTable, clearAll } = useSelectionStore()
  const selectedTableIds = useSelectionStore((s) => s.tableIds)
  const selectedTableIdSet = useMemo(() => new Set(selectedTableIds), [selectedTableIds])

  const [nodes, setNodes] = useState<Node[]>(() =>
    erdToNodes(present.tables, tableFocuses, selectedTableIdSet)
  )
  const [edges, setEdges] = useState<Edge[]>(() => erdToEdges(present.relationships))

  const rfRef = useRef<ReactFlowInstance | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNodes(erdToNodes(present.tables, tableFocuses, selectedTableIdSet))
    setEdges(erdToEdges(present.relationships))
  }, [present, tableFocuses, selectedTableIdSet])

  // Delete key: remove selected tables and columns in one history step
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const { tableIds, columnKeys } = useSelectionStore.getState()
      if (tableIds.length === 0 && columnKeys.length === 0) return

      const colItems = columnKeys.map((key) => {
        const [tableId, colIdxStr] = key.split(':')
        return { tableId, colIndex: parseInt(colIdxStr) }
      })
      removeItems(tableIds, colItems)
      clearAll()
      onSelectTable(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [removeItems, clearAll, onSelectTable])

  // Custom wheel: scroll=pan vertical, shift+scroll=horizontal, ctrl+scroll=zoom
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      const rf = rfRef.current
      if (!rf) return
      e.preventDefault()

      const { x, y, zoom } = rf.getViewport()

      if (e.ctrlKey) {
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
        const newZoom = Math.min(Math.max(zoom * factor, 0.1), 4)
        const rect = el.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const px = (cx - x) / zoom
        const py = (cy - y) / zoom
        rf.setViewport({ x: cx - px * newZoom, y: cy - py * newZoom, zoom: newZoom })
      } else if (e.shiftKey) {
        rf.setViewport({ x: x - e.deltaY, y, zoom })
      } else {
        rf.setViewport({ x, y: y - e.deltaY, zoom })
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Filter out ReactFlow's internal select changes — selection is managed by selectionStore
      const filtered = changes.filter((c) => c.type !== 'select')
      setNodes((nds) => applyNodeChanges(filtered, nds))
    },
    []
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, _node, draggedNodes) => {
      draggedNodes.forEach((n) => moveTable(n.id, n.position.x, n.position.y))
    },
    [moveTable]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const fromParts = connection.sourceHandle?.split('__') ?? []
      const toParts = connection.targetHandle?.split('__') ?? []
      if (fromParts.length < 2 || toParts.length < 2) return

      addRelationship({
        sourceTableId: fromParts[0],
        sourceColumnName: fromParts[1],
        targetTableId: toParts[0],
        targetColumnName: toParts[1],
        type: 'one-to-many',
      })
      setEdges((eds) => addEdge(connection, eds))
    },
    [addRelationship]
  )

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      removeRelationship(edge.id)
    },
    [removeRelationship]
  )

  // Single click: highlight + show properties if single selection
  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      const multi = event.ctrlKey || event.metaKey
      selectTable(node.id, multi)
      focusTable(node.id)
      if (!multi) {
        const table = present.tables.find((t) => t.id === node.id) ?? null
        onSelectTable(table)
      } else {
        onSelectTable(null)
      }
    },
    [selectTable, focusTable, present.tables, onSelectTable]
  )

  // Double click: activate table name editing (sidebar already open from single click)
  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setEditingTable(node.id)
    },
    [setEditingTable]
  )

  const onPaneClick = useCallback(() => {
    clearAll()
    onSelectTable(null)
    focusTable(null)
  }, [clearAll, onSelectTable, focusTable])

  return (
    <div ref={wrapperRef} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onInit={(instance) => { rfRef.current = instance }}
        nodeTypes={nodeTypes}
        zoomOnScroll={false}
        panOnScroll={false}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => (node.data as { color?: string }).color || '#6366f1'}
          nodeStrokeColor="transparent"
          nodeStrokeWidth={0}
          maskColor={theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}
          style={{
            background: theme === 'dark' ? '#1e2330' : '#f1f5f9',
            border: `1px solid ${theme === 'dark' ? '#30363d' : '#e2e8f0'}`,
            borderRadius: 8,
            width: 200,
            height: 140,
          }}
        />
      </ReactFlow>
    </div>
  )
}
