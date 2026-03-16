import { useState, useRef, useEffect } from 'react'
import { parseDdl } from '../api/ddlApi'
import { listConnections, createConnection, deleteConnection, testConnection, importFromConnection } from '../api/connectionApi'
import type { DbConnection, ErdData } from '../types/erd'

interface Props {
  onClose: () => void
  onImport: (data: ErdData, mode: 'replace' | 'merge') => void
}

const DB_TYPES = ['mysql', 'postgresql', 'mssql']
const DEFAULT_PORTS: Record<string, number> = { mysql: 3306, postgresql: 5432, mssql: 1433 }

function DbConnectionTab({ onParsed }: { onParsed: (data: ErdData) => void }) {
  const [connections, setConnections] = useState<DbConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<DbConnection, 'id'>>({
    name: '', type: 'mysql', host: 'localhost', port: 3306,
    database: '', username: '', password: '', ssl: false,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<number | null>(null)
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null)
  const [importing, setImporting] = useState<number | null>(null)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    listConnections().then(setConnections).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!form.name.trim() || !form.type) return
    setSaving(true)
    try {
      const conn = await createConnection(form)
      setConnections((prev) => [conn, ...prev])
      setShowForm(false)
      setForm({ name: '', type: 'mysql', host: 'localhost', port: 3306, database: '', username: '', password: '', ssl: false })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    await deleteConnection(id)
    setConnections((prev) => prev.filter((c) => c.id !== id))
  }

  const handleTest = async (id: number) => {
    setTesting(id)
    setTestResult(null)
    try {
      const result = await testConnection(id)
      setTestResult({ id, ...result })
    } catch {
      setTestResult({ id, success: false, message: 'Request failed' })
    } finally {
      setTesting(null)
    }
  }

  const handleImport = async (id: number) => {
    setImporting(id)
    setImportError('')
    try {
      const data = await importFromConnection(id)
      onParsed(data)
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Connections list */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : connections.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          저장된 연결이 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div key={conn.id} className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{conn.name}</p>
                <p className="text-xs text-gray-400">{conn.type} · {conn.host}:{conn.port} / {conn.database}</p>
              </div>
              {testResult != null && testResult.id === conn.id && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${testResult.success ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                  {testResult.success ? '✓ OK' : '✗ Fail'}
                </span>
              )}
              <button
                onClick={() => handleTest(conn.id!)}
                disabled={testing === conn.id}
                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {testing === conn.id ? '…' : 'Test'}
              </button>
              <button
                onClick={() => handleImport(conn.id!)}
                disabled={importing === conn.id}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {importing === conn.id ? '…' : 'Import'}
              </button>
              <button
                onClick={() => handleDelete(conn.id!)}
                className="text-gray-400 hover:text-red-500 text-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {importError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {importError}
        </div>
      )}

      {/* Add connection form */}
      {showForm ? (
        <div className="border border-gray-200 dark:border-gray-600 rounded-md p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">새 연결 추가</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <input
                placeholder="이름"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, port: DEFAULT_PORTS[e.target.value] ?? f.port }))}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {DB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="number"
              placeholder="Port"
              value={form.port ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, port: e.target.value ? parseInt(e.target.value) : null }))}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              placeholder="Host"
              value={form.host ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              placeholder="Database"
              value={form.database ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, database: e.target.value }))}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              placeholder="Username"
              value={form.username ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 col-span-2">
              <input type="checkbox" checked={form.ssl} onChange={(e) => setForm((f) => ({ ...f, ssl: e.target.checked }))} />
              SSL
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          + 새 연결 추가
        </button>
      )}
    </div>
  )
}

const DIALECTS = ['mysql', 'postgresql', 'oracle', 'mssql']

type Tab = 'sql' | 'file' | 'db'

export default function ImportModal({ onClose, onImport }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('sql')
  const [dialect, setDialect] = useState('mysql')
  const [sql, setSql] = useState('')
  const [parsed, setParsed] = useState<ErdData | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [mode, setMode] = useState<'replace' | 'merge'>('replace')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleParse = async (sqlText: string) => {
    if (!sqlText.trim()) {
      setError('Please enter SQL text')
      return
    }
    setLoading(true)
    setError('')
    setParsed(null)
    setWarnings([])
    try {
      const result = await parseDdl(sqlText, dialect)
      setParsed(result.erdData)
      setWarnings(result.warnings || [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to parse SQL'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('')
    setParsed(null)
    setWarnings([])
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File exceeds 10MB limit')
      return
    }
    const text = await file.text()
    setSql(text)
    await handleParse(text)
  }

  const handleApply = () => {
    if (!parsed) return
    onImport(parsed, mode)
    onClose()
  }

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import Schema</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button className={tabClass('sql')} onClick={() => setActiveTab('sql')}>SQL Text</button>
          <button className={tabClass('file')} onClick={() => setActiveTab('file')}>File Upload</button>
          <button className={tabClass('db')} onClick={() => setActiveTab('db')}>DB Connection</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Dialect selector — shared across SQL and File tabs */}
          {activeTab !== 'db' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dialect</label>
              <select
                value={dialect}
                onChange={(e) => setDialect(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {DIALECTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tab: SQL Text */}
          {activeTab === 'sql' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SQL</label>
                <textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  rows={10}
                  placeholder="Paste your CREATE TABLE statements here..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => handleParse(sql)}
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Parsing…' : 'Parse'}
              </button>
            </>
          )}

          {/* Tab: File Upload */}
          {activeTab === 'file' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  SQL File (.sql, max 10MB)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sql"
                  onChange={handleFileSelect}
                  className="block text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                {fileError && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fileError}</p>
                )}
              </div>
            </>
          )}

          {/* Tab: DB Connection */}
          {activeTab === 'db' && (
            <DbConnectionTab onParsed={(data) => { setParsed(data); setWarnings([]) }} />
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
              <p className="font-medium mb-1">Warnings ({warnings.length})</p>
              <ul className="list-disc list-inside space-y-0.5">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Preview */}
          {parsed && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md px-4 py-3 text-sm text-green-800 dark:text-green-300">
              Parsed successfully: {parsed.tables.length} table(s), {parsed.relationships.length} relationship(s)
            </div>
          )}

          {/* Mode + Apply */}
          {parsed && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="replace"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                  />
                  Replace existing schema
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="merge"
                    checked={mode === 'merge'}
                    onChange={() => setMode('merge')}
                  />
                  Merge (keep existing tables)
                </label>
              </div>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
