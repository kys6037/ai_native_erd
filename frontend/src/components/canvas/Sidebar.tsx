import type { ErdTable, ColumnMetadata, ForeignKeyRef } from '../../types/erd'
import useErdStore from '../../stores/erdStore'

interface Props {
  table: ErdTable | null
  onClose: () => void
}

const SQL_TYPES = ['INT', 'BIGINT', 'VARCHAR', 'TEXT', 'BOOLEAN', 'DECIMAL', 'TIMESTAMP', 'DATE', 'UUID', 'JSON', 'FLOAT', 'DOUBLE']

export default function Sidebar({ table, onClose }: Props) {
  const { updateTableName, updateColumn, addColumn, removeColumn, removeTable, present } = useErdStore()

  if (!table) {
    return (
      <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center">
        <p className="text-sm text-gray-400">Select a table to edit</p>
      </div>
    )
  }

  const handleColChange = (idx: number, field: keyof ColumnMetadata, value: string | boolean | number | null | ForeignKeyRef) => {
    const updated: ColumnMetadata = { ...table.columns[idx], [field]: value }
    updateColumn(table.id, idx, updated)
  }

  const otherTables = present.tables.filter((t) => t.id !== table.id)

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="font-semibold text-sm text-gray-900 dark:text-white">Table Properties</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Table name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Table Name</label>
          <input
            type="text"
            value={table.name}
            onChange={(e) => updateTableName(table.id, e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Columns */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Columns</label>
            <button onClick={() => addColumn(table.id)} className="text-xs text-blue-600 hover:underline">+ Add</button>
          </div>
          <div className="space-y-3">
            {table.columns.map((col, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-2">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => handleColChange(idx, 'name', e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="column_name"
                  />
                  <button onClick={() => removeColumn(table.id, col.name)} className="text-red-400 hover:text-red-600 text-sm leading-none px-1" title="Remove">×</button>
                </div>

                <div className="flex gap-1">
                  <select
                    value={col.type}
                    onChange={(e) => handleColChange(idx, 'type', e.target.value)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {SQL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {(col.type === 'VARCHAR' || col.type === 'DECIMAL') && (
                    <input
                      type="number"
                      value={col.length ?? ''}
                      onChange={(e) => handleColChange(idx, 'length', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="len"
                      className="w-14 border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={col.primaryKey} onChange={(e) => handleColChange(idx, 'primaryKey', e.target.checked)} />
                    PK
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={col.autoIncrement} onChange={(e) => handleColChange(idx, 'autoIncrement', e.target.checked)} />
                    AI
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={col.nullable} onChange={(e) => handleColChange(idx, 'nullable', e.target.checked)} />
                    Null
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={col.unique} onChange={(e) => handleColChange(idx, 'unique', e.target.checked)} />
                    UQ
                  </label>
                </div>

                {/* FK설정 */}
                {!col.primaryKey && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Foreign Key</label>
                    <select
                      value={col.foreignKey ? `${col.foreignKey.referencedTable}.${col.foreignKey.referencedColumn}` : ''}
                      onChange={(e) => {
                        if (!e.target.value) {
                          handleColChange(idx, 'foreignKey', null)
                        } else {
                          const [referencedTable, referencedColumn] = e.target.value.split('.')
                          handleColChange(idx, 'foreignKey', { referencedTable, referencedColumn })
                        }
                      }}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">None</option>
                      {otherTables.flatMap((t) =>
                        t.columns.map((c) => (
                          <option key={`${t.id}.${c.name}`} value={`${t.name}.${c.name}`}>
                            {t.name}.{c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => { removeTable(table.id); onClose() }}
          className="w-full px-3 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Delete Table
        </button>
      </div>
    </div>
  )
}
