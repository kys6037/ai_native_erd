import { useState, useRef } from 'react'
import { parseDdl } from '../api/ddlApi'
import type { ErdData } from '../types/erd'

interface Props {
  onClose: () => void
  onImport: (data: ErdData, mode: 'replace' | 'merge') => void
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
            <div className="py-8 text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">DB connection import coming soon</p>
            </div>
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
