import { useState, useEffect } from 'react'
import { listDictionary, upsertDictionary, deleteDictionaryEntry } from '../api/dictionaryApi'
import type { ErdTable, DictionaryEntry } from '../types/erd'

interface Props {
  projectId: number
  tables: ErdTable[]
  onClose: () => void
}

interface EntryForm {
  tableName: string
  columnName: string | null
  description: string
  dataStandard: string
  domain: string
  example: string
  isDirty: boolean
  id?: number
}

function emptyForm(tableName: string, columnName: string | null): EntryForm {
  return { tableName, columnName, description: '', dataStandard: '', domain: '', example: '', isDirty: false }
}

function entryToForm(entry: DictionaryEntry): EntryForm {
  return {
    id: entry.id,
    tableName: entry.tableName,
    columnName: entry.columnName ?? null,
    description: entry.description ?? '',
    dataStandard: entry.dataStandard ?? '',
    domain: entry.domain ?? '',
    example: entry.example ?? '',
    isDirty: false,
  }
}

export default function DictionaryModal({ projectId, tables, onClose }: Props) {
  const [selectedTable, setSelectedTable] = useState<string>(tables[0]?.name ?? '')
  const [, setEntries] = useState<DictionaryEntry[]>([])
  const [forms, setForms] = useState<Record<string, EntryForm>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedTable) return
    loadEntries(selectedTable)
  }, [selectedTable])

  const loadEntries = async (tableName: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await listDictionary(projectId, tableName)
      setEntries(data)
      initForms(tableName, data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load dictionary'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const initForms = (tableName: string, data: DictionaryEntry[]) => {
    const table = tables.find((t) => t.name === tableName)
    if (!table) return

    const newForms: Record<string, EntryForm> = {}

    // Table-level entry
    const tableEntry = data.find((e) => !e.columnName)
    newForms[`table:${tableName}`] = tableEntry ? entryToForm(tableEntry) : emptyForm(tableName, null)

    // Column-level entries
    for (const col of table.columns) {
      const colEntry = data.find((e) => e.columnName === col.name)
      newForms[`col:${col.name}`] = colEntry ? entryToForm(colEntry) : emptyForm(tableName, col.name)
    }

    setForms(newForms)
  }

  const updateForm = (key: string, field: keyof EntryForm, value: string) => {
    setForms((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value, isDirty: true },
    }))
  }

  const handleSave = async (key: string) => {
    const form = forms[key]
    if (!form) return
    setSaving(key)
    try {
      const saved = await upsertDictionary(projectId, {
        projectId,
        tableName: form.tableName,
        columnName: form.columnName,
        description: form.description || null,
        dataStandard: form.dataStandard || null,
        domain: form.domain || null,
        example: form.example || null,
      })
      setForms((prev) => ({ ...prev, [key]: { ...entryToForm(saved), isDirty: false } }))
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === saved.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = saved
          return next
        }
        return [...prev, saved]
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      alert(msg)
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (key: string) => {
    const form = forms[key]
    if (!form?.id) {
      // Not saved yet — just reset
      const col = form?.columnName ?? null
      setForms((prev) => ({ ...prev, [key]: emptyForm(selectedTable, col) }))
      return
    }
    if (!confirm('Delete this entry?')) return
    try {
      await deleteDictionaryEntry(projectId, form.id)
      setEntries((prev) => prev.filter((e) => e.id !== form.id))
      const col = form.columnName ?? null
      setForms((prev) => ({ ...prev, [key]: emptyForm(selectedTable, col) }))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete'
      alert(msg)
    }
  }

  const currentTable = tables.find((t) => t.name === selectedTable)

  const renderForm = (key: string, label: string) => {
    const form = forms[key]
    if (!form) return null
    return (
      <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <div className="flex gap-2">
            {form.isDirty && (
              <button
                onClick={() => handleSave(key)}
                disabled={saving === key}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving === key ? 'Saving…' : 'Save'}
              </button>
            )}
            {(form.id || form.isDirty) && (
              <button
                onClick={() => handleDelete(key)}
                className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => updateForm(key, 'description', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Description"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Data Standard</label>
            <input
              type="text"
              value={form.dataStandard}
              onChange={(e) => updateForm(key, 'dataStandard', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g. ISO 8601"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Domain</label>
            <input
              type="text"
              value={form.domain}
              onChange={(e) => updateForm(key, 'domain', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g. User Management"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">Example</label>
            <input
              type="text"
              value={form.example}
              onChange={(e) => updateForm(key, 'example', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g. john@example.com"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data Dictionary</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Table selector */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Table</label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {tables.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {!loading && currentTable && (
            <>
              {/* Table-level form */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  Table: {selectedTable}
                </h3>
                {renderForm(`table:${selectedTable}`, 'Table Description')}
              </div>

              {/* Column-level forms */}
              {currentTable.columns.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    Columns
                  </h3>
                  <div className="space-y-3">
                    {currentTable.columns.map((col) =>
                      renderForm(`col:${col.name}`, `${col.name} (${col.type})`)
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && tables.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">No tables in this project yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
