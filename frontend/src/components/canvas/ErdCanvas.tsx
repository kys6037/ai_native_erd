import { useCallback, useEffect, useState } from 'react'
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
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import TableNode, { type TableNodeType } from './TableNode'
import useErdStore from '../../stores/erdStore'
import type { ErdTable, ErdRelationship } from '../../types/erd'
import type { CollabUser } from '../../hooks/useCollaboration'

const nodeTypes = { tableNode: TableNode }

interface Props {
  onSelectTable: (table: ErdTable | null) => void
  tableFocuses: Record<string, CollabUser[]>
  focusTable: (tableId: string | null) => void
}

function erdToNodes(tables: ErdTable[], tableFocuses: Record<string, CollabUser[]>): Node[] {
  return tables.map((t) => ({
    id: t.id,
    type: 'tableNode',
    position: { x: t.x, y: t.y },
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
  const { present, moveTable, addRelationship, removeRelationship } = useErdStore()

  const [nodes, setNodes] = useState<Node[]>(() => erdToNodes(present.tables, tableFocuses))
  const [edges, setEdges] = useState<Edge[]>(() => erdToEdges(present.relationships))

  useEffect(() => {
    setNodes(erdToNodes(present.tables, tableFocuses))
    setEdges(erdToEdges(present.relationships))
  }, [present, tableFocuses])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      moveTable(node.id, node.position.x, node.position.y)
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

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const table = present.tables.find((t) => t.id === node.id) ?? null
      onSelectTable(table)
      focusTable(node.id)
    },
    [present.tables, onSelectTable, focusTable]
  )

  const onPaneClick = useCallback(() => {
    onSelectTable(null)
    focusTable(null)
  }, [onSelectTable, focusTable])

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
