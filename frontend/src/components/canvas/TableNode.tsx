import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { ErdTable } from '../../types/erd'

export type TableNodeType = Node<ErdTable & Record<string, unknown>, 'tableNode'>

function TableNode({ data }: NodeProps<TableNodeType>) {
  const table = data as ErdTable

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-md min-w-[200px]">
      <div
        className="px-3 py-2 rounded-t-md font-semibold text-sm text-white"
        style={{ backgroundColor: table.color || '#6366f1' }}
      >
        {table.schema ? `${table.schema}.${table.name}` : table.name}
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {table.columns.map((col, idx) => (
          <div key={idx} className="relative flex items-center gap-1 px-3 py-1 text-xs">
            <Handle
              type="source"
              position={Position.Right}
              id={`${table.id}__${col.name}__source`}
              style={{ top: '50%', right: -6 }}
            />
            <Handle
              type="target"
              position={Position.Left}
              id={`${table.id}__${col.name}__target`}
              style={{ top: '50%', left: -6 }}
            />
            {col.primaryKey && (
              <span className="text-yellow-500 font-bold shrink-0" title="Primary Key">PK</span>
            )}
            {!col.primaryKey && col.foreignKey && (
              <span className="text-blue-500 font-bold shrink-0" title="Foreign Key">FK</span>
            )}
            <span className="text-gray-800 dark:text-gray-200 font-medium truncate">{col.name}</span>
            <span className="text-gray-400 ml-auto shrink-0">
              {col.type}{col.length ? `(${col.length})` : ''}
            </span>
            {!col.nullable && (
              <span className="text-red-400 shrink-0" title="NOT NULL">*</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default memo(TableNode)
