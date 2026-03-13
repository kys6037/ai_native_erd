import { useState } from 'react'
import useErdStore from '../stores/erdStore'
import type { ErdTable, IndexMetadata } from '../types/erd'

interface Props {
  table: ErdTable
}

export default function IndexesPanel({ table }: Props) {
  const { updateTableIndexes } = useErdStore()
  const [newName, setNewName] = useState('')
  const [newColumns, setNewColumns] = useState<string[]>([])
  const [newUnique, setNewUnique] = useState(false)
  const [addError, setAddError] = useState('')

  const handleAddIndex = () => {
    setAddError('')
    if (!newName.trim()) {
      setAddError('Index name is required')
      return
    }
    if (newColumns.length === 0) {
      setAddError('Select at least one column')
      return
    }
    const duplicate = table.indexes.some((idx) => idx.name === newName.trim())
    if (duplicate) {
      setAddError('An index with this name already exists')
      return
    }
    const updated: IndexMetadata[] = [
      ...table.indexes,
      { name: newName.trim(), columns: newColumns, unique: newUnique },
    ]
    updateTableIndexes(table.id, updated)
    setNewName('')
    setNewColumns([])
    setNewUnique(false)
  }

  const handleRemoveIndex = (indexName: string) => {
    const updated = table.indexes.filter((idx) => idx.name !== indexName)
    updateTableIndexes(table.id, updated)
  }

  const toggleColumn = (colName: string) => {
    setNewColumns((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    )
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Indexes</label>

      {/* Existing indexes */}
      {table.indexes.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">No indexes defined</p>
      )}
      <div className="space-y-2">
        {table.indexes.map((idx) => (
          <div
            key={idx.name}
            className="flex items-start justify-between border border-gray-200 dark:border-gray-700 rounded-md p-2"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{idx.name}</span>
                {idx.unique && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 rounded">UQ</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {idx.columns.map((c) => (
                  <span
                    key={c}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => handleRemoveIndex(idx.name)}
              className="text-red-400 hover:text-red-600 text-sm leading-none ml-2 shrink-0"
              title="Remove index"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add index form */}
      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md p-3 space-y-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Add Index</p>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Index name"
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {/* Column multi-select */}
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Columns</p>
          <div className="flex flex-wrap gap-1.5">
            {table.columns.map((col) => (
              <button
                key={col.name}
                type="button"
                onClick={() => toggleColumn(col.name)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  newColumns.includes(col.name)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={newUnique}
            onChange={(e) => setNewUnique(e.target.checked)}
          />
          Unique
        </label>

        {addError && <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>}

        <button
          onClick={handleAddIndex}
          className="w-full px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Index
        </button>
      </div>
    </div>
  )
}
