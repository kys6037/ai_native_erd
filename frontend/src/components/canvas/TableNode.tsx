import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { ErdTable, ColumnMetadata } from '../../types/erd'
import type { CollabUser } from '../../hooks/useCollaboration'
import useErdStore from '../../stores/erdStore'

export type TableNodeType = Node<
  ErdTable & { _focusedBy?: CollabUser[] } & Record<string, unknown>,
  'tableNode'
>

const USER_COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#06b6d4', '#6366f1']
function userColor(userId: number) {
  return USER_COLORS[userId % USER_COLORS.length]
}

interface ColumnRowProps {
  tableId: string
  colIndex: number
  col: ColumnMetadata
}

function ColumnRow({ tableId, colIndex, col }: ColumnRowProps) {
  const updateColumn = useErdStore((s) => s.updateColumn)
  const [name, setName] = useState(col.name)
  const [comment, setComment] = useState(col.comment ?? '')
  const [type, setType] = useState(col.type)
  const focusedRef = useRef(false)

  // Sync external changes when not actively editing
  useEffect(() => {
    if (!focusedRef.current) {
      setName(col.name)
      setComment(col.comment ?? '')
      setType(col.type)
    }
  }, [col.name, col.comment, col.type])

  const commit = () => {
    focusedRef.current = false
    updateColumn(tableId, colIndex, {
      ...col,
      name: name.trim() || col.name,
      comment: comment.trim() || null,
      type: type.trim() || col.type,
    })
  }

  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation()

  return (
    <div className="relative grid grid-cols-[1fr_1fr_72px_28px] items-center border-b border-gray-100 dark:border-gray-700 last:border-0 group">
      <Handle
        type="source"
        position={Position.Right}
        id={`${tableId}__${col.name}__source`}
        style={{ right: -5, top: '50%' }}
        className="!w-2 !h-2 !border !bg-white dark:!bg-gray-600"
      />
      <Handle
        type="target"
        position={Position.Left}
        id={`${tableId}__${col.name}__target`}
        style={{ left: -5, top: '50%' }}
        className="!w-2 !h-2 !border !bg-white dark:!bg-gray-600"
      />

      {/* name */}
      <div className="flex items-center gap-1 px-2 py-1 min-w-0">
        {col.primaryKey && (
          <span className="text-yellow-500 font-bold text-[9px] shrink-0">PK</span>
        )}
        {!col.primaryKey && col.foreignKey && (
          <span className="text-blue-400 font-bold text-[9px] shrink-0">FK</span>
        )}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => { focusedRef.current = true }}
          onBlur={commit}
          onMouseDown={stop}
          onKeyDown={stop}
          className="w-full text-xs text-gray-800 dark:text-gray-200 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-400 outline-none min-w-0 truncate"
        />
      </div>

      {/* description */}
      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onFocus={() => { focusedRef.current = true }}
        onBlur={commit}
        onMouseDown={stop}
        onKeyDown={stop}
        placeholder="설명..."
        className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-400 outline-none min-w-0 truncate placeholder:text-gray-300 dark:placeholder:text-gray-600"
      />

      {/* data type */}
      <input
        value={type}
        onChange={(e) => setType(e.target.value)}
        onFocus={() => { focusedRef.current = true }}
        onBlur={commit}
        onMouseDown={stop}
        onKeyDown={stop}
        className="px-2 py-1 text-xs text-purple-600 dark:text-purple-400 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-400 outline-none truncate"
      />

      {/* nullable */}
      <div className="flex justify-center items-center py-1">
        <input
          type="checkbox"
          checked={col.nullable}
          onChange={(e) =>
            updateColumn(tableId, colIndex, { ...col, nullable: e.target.checked })
          }
          onMouseDown={stop}
          title="Nullable"
          className="cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  )
}

function TableNode({ data }: NodeProps<TableNodeType>) {
  const table = data as ErdTable & { _focusedBy?: CollabUser[] }
  const focusedBy = table._focusedBy ?? []
  const updateTableName = useErdStore((s) => s.updateTableName)
  const [tableName, setTableName] = useState(table.name)
  const tableNameFocusedRef = useRef(false)

  useEffect(() => {
    if (!tableNameFocusedRef.current) setTableName(table.name)
  }, [table.name])

  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation()

  const ringStyle =
    focusedBy.length > 0
      ? { outline: `2px solid ${userColor(focusedBy[0].userId)}`, outlineOffset: '2px' }
      : {}

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md min-w-[300px] border border-gray-200 dark:border-gray-600"
      style={ringStyle}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md flex items-center gap-2"
        style={{ backgroundColor: table.color || '#6366f1' }}
      >
        <input
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          onFocus={() => { tableNameFocusedRef.current = true }}
          onBlur={() => {
            tableNameFocusedRef.current = false
            updateTableName(table.id, tableName.trim() || table.name)
          }}
          onMouseDown={stop}
          onKeyDown={stop}
          className="flex-1 bg-transparent text-white font-semibold text-sm outline-none border-b border-transparent hover:border-white/50 focus:border-white min-w-0"
        />

        {/* Focus badges — fixed size, truncated */}
        {focusedBy.length > 0 && (
          <div className="flex gap-1 shrink-0">
            {focusedBy.slice(0, 2).map((u) => (
              <span
                key={u.userId}
                title={u.userName}
                className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium text-white w-[56px] overflow-hidden"
                style={{ backgroundColor: userColor(u.userId) }}
              >
                <span className="truncate leading-none">{u.userName}</span>
              </span>
            ))}
            {focusedBy.length > 2 && (
              <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium bg-black/30 text-white shrink-0">
                +{focusedBy.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Column header row */}
      <div className="grid grid-cols-[1fr_1fr_72px_28px] bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
        <div className="px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Name</div>
        <div className="px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Description</div>
        <div className="px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Type</div>
        <div className="px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">N</div>
      </div>

      {/* Column rows */}
      <div>
        {table.columns.map((col, idx) => (
          <ColumnRow key={idx} tableId={table.id} colIndex={idx} col={col} />
        ))}
      </div>
    </div>
  )
}

export default memo(TableNode)
