import { useState, useEffect } from 'react'
import { getVersion, generateMigration } from '../api/versionApi'
import type { SchemaDiff, VersionDetail } from '../types/erd'

interface Props {
  projectId: number
  fromVersionId: number
  toVersionId: number
  onClose: () => void
}

const DIALECTS = ['mysql', 'postgresql', 'oracle', 'mssql']

function computeDiff(from: VersionDetail, to: VersionDetail): SchemaDiff {
  const fromTableMap = new Map(from.erdData.tables.map((t) => [t.id, t]))
  const toTableMap = new Map(to.erdData.tables.map((t) => [t.id, t]))
  const fromRelMap = new Map(from.erdData.relationships.map((r) => [r.id, r]))
  const toRelMap = new Map(to.erdData.relationships.map((r) => [r.id, r]))

  const addedTables = to.erdData.tables.filter((t) => !fromTableMap.has(t.id))
  const removedTables = from.erdData.tables.filter((t) => !toTableMap.has(t.id))
  const addedRelationships = to.erdData.relationships.filter((r) => !fromRelMap.has(r.id))
  const removedRelationships = from.erdData.relationships.filter((r) => !toRelMap.has(r.id))

  const modifiedTables = to.erdData.tables
    .filter((toTable) => fromTableMap.has(toTable.id))
    .map((toTable) => {
      const fromTable = fromTableMap.get(toTable.id)!
      const fromColMap = new Map(fromTable.columns.map((c) => [c.name, c]))
      const toColMap = new Map(toTable.columns.map((c) => [c.name, c]))

      const addedColumns = toTable.columns.filter((c) => !fromColMap.has(c.name))
      const removedColumns = fromTable.columns.filter((c) => !toColMap.has(c.name))
      const modifiedColumns = toTable.columns
        .filter((c) => {
          const fc = fromColMap.get(c.name)
          if (!fc) return false
          return JSON.stringify(fc) !== JSON.stringify(c)
        })
        .map((c) => ({ columnName: c.name, before: fromColMap.get(c.name)!, after: c }))

      return {
        tableId: toTable.id,
        tableName: toTable.name,
        addedColumns,
        removedColumns,
        modifiedColumns,
      }
    })
    .filter((td) => td.addedColumns.length > 0 || td.removedColumns.length > 0 || td.modifiedColumns.length > 0)

  return { addedTables, removedTables, modifiedTables, addedRelationships, removedRelationships }
}

export default function DiffModal({ projectId, fromVersionId, toVersionId, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [diff, setDiff] = useState<SchemaDiff | null>(null)
  const [fromVersion, setFromVersion] = useState<VersionDetail | null>(null)
  const [toVersion, setToVersion] = useState<VersionDetail | null>(null)
  const [migrationDialect, setMigrationDialect] = useState('mysql')
  const [migrationSql, setMigrationSql] = useState('')
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [migrationError, setMigrationError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [from, to] = await Promise.all([
          getVersion(projectId, fromVersionId),
          getVersion(projectId, toVersionId),
        ])
        setFromVersion(from)
        setToVersion(to)
        setDiff(computeDiff(from, to))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load versions'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, fromVersionId, toVersionId])

  const handleGenerateMigration = async () => {
    setMigrationLoading(true)
    setMigrationError('')
    setMigrationSql('')
    try {
      const result = await generateMigration(fromVersionId, toVersionId, migrationDialect)
      setMigrationSql(result.sql)
    } catch {
      // Fall back to client-side empty SQL note
      setMigrationError('Migration API not available. SQL generation requires server support.')
    } finally {
      setMigrationLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(migrationSql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleDownload = () => {
    const blob = new Blob([migrationSql], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `migration_v${fromVersion?.versionNumber}_to_v${toVersion?.versionNumber}.sql`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Schema Diff
            {fromVersion && toVersion && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                v{fromVersion.versionNumber} → v{toVersion.versionNumber}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading versions…</p>}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {diff && (
            <>
              {/* Added tables */}
              {diff.addedTables.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                    Added Tables ({diff.addedTables.length})
                  </h3>
                  <div className="space-y-1">
                    {diff.addedTables.map((t) => (
                      <div key={t.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2 text-sm text-green-800 dark:text-green-300">
                        + {t.name} ({t.columns.length} columns)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed tables */}
              {diff.removedTables.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                    Removed Tables ({diff.removedTables.length})
                  </h3>
                  <div className="space-y-1">
                    {diff.removedTables.map((t) => (
                      <div key={t.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 text-sm text-red-800 dark:text-red-300">
                        - {t.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modified tables */}
              {diff.modifiedTables.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                    Modified Tables ({diff.modifiedTables.length})
                  </h3>
                  <div className="space-y-2">
                    {diff.modifiedTables.map((td) => (
                      <div key={td.tableId} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded px-3 py-2 text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">~ {td.tableName}</p>
                        {td.addedColumns.length > 0 && (
                          <ul className="ml-3 space-y-0.5">
                            {td.addedColumns.map((c) => (
                              <li key={c.name} className="text-green-700 dark:text-green-400">+ {c.name} ({c.type})</li>
                            ))}
                          </ul>
                        )}
                        {td.removedColumns.length > 0 && (
                          <ul className="ml-3 space-y-0.5">
                            {td.removedColumns.map((c) => (
                              <li key={c.name} className="text-red-700 dark:text-red-400">- {c.name}</li>
                            ))}
                          </ul>
                        )}
                        {td.modifiedColumns.length > 0 && (
                          <ul className="ml-3 space-y-0.5">
                            {td.modifiedColumns.map((cd) => (
                              <li key={cd.columnName} className="text-yellow-700 dark:text-yellow-400">
                                ~ {cd.columnName}: {cd.before.type} → {cd.after.type}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Relationships */}
              {diff.addedRelationships.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                    Added Relationships ({diff.addedRelationships.length})
                  </h3>
                  {diff.addedRelationships.map((r) => (
                    <div key={r.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2 text-sm text-green-800 dark:text-green-300">
                      + {r.sourceTableId}.{r.sourceColumnName} → {r.targetTableId}.{r.targetColumnName} ({r.type})
                    </div>
                  ))}
                </div>
              )}
              {diff.removedRelationships.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                    Removed Relationships ({diff.removedRelationships.length})
                  </h3>
                  {diff.removedRelationships.map((r) => (
                    <div key={r.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2 text-sm text-red-800 dark:text-red-300">
                      - {r.sourceTableId}.{r.sourceColumnName} → {r.targetTableId}.{r.targetColumnName}
                    </div>
                  ))}
                </div>
              )}

              {diff.addedTables.length === 0 && diff.removedTables.length === 0 &&
               diff.modifiedTables.length === 0 && diff.addedRelationships.length === 0 &&
               diff.removedRelationships.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No differences found between these versions.</p>
              )}

              {/* Migration SQL */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Generate Migration SQL</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={migrationDialect}
                    onChange={(e) => setMigrationDialect(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {DIALECTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button
                    onClick={handleGenerateMigration}
                    disabled={migrationLoading}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {migrationLoading ? 'Generating…' : 'Generate Migration'}
                  </button>
                </div>

                {migrationError && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
                    {migrationError}
                  </div>
                )}

                {migrationSql && (
                  <div className="space-y-2">
                    <pre className="bg-gray-900 text-green-400 rounded-md p-4 text-xs overflow-auto max-h-48 font-mono whitespace-pre-wrap">
                      {migrationSql}
                    </pre>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopy}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
