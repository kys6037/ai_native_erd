import { useState, useEffect } from 'react'
import { listVersions, createVersion, restoreVersion } from '../api/versionApi'
import DiffModal from './DiffModal'
import type { VersionSummary, ErdData } from '../types/erd'

interface Props {
  projectId: number
  onClose: () => void
  onRestored: (data: ErdData) => void
}

export default function VersionModal({ projectId, onClose, onRestored }: Props) {
  const [versions, setVersions] = useState<VersionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [restoringId, setRestoringId] = useState<number | null>(null)
  const [diffVersions, setDiffVersions] = useState<{ from: number; to: number } | null>(null)

  useEffect(() => {
    loadVersions()
  }, [projectId])

  const loadVersions = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listVersions(projectId)
      // Sort by versionNumber descending
      setVersions(data.sort((a, b) => b.versionNumber - a.versionNumber))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load versions'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newMessage.trim()) {
      setCreateError('Please enter a version message')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      await createVersion(projectId, newMessage.trim())
      setNewMessage('')
      await loadVersions()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create version'
      setCreateError(msg)
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (versionId: number) => {
    if (!confirm('Restore this version? Current unsaved changes will be lost.')) return
    setRestoringId(versionId)
    try {
      const project = await restoreVersion(projectId, versionId)
      onRestored(project.erdData)
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to restore version'
      alert(msg)
    } finally {
      setRestoringId(null)
    }
  }

  const handleViewDiff = (version: VersionSummary) => {
    const idx = versions.findIndex((v) => v.id === version.id)
    // Compare with the previous version (older one)
    const prevVersion = versions[idx + 1]
    if (!prevVersion) {
      // First version — compare with itself (will show all as added)
      setDiffVersions({ from: version.id, to: version.id })
    } else {
      setDiffVersions({ from: prevVersion.id, to: version.id })
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Create Version */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Create New Version</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Version message (e.g. Add user tables)"
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
              {createError && (
                <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Version List */}
            {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading versions…</p>}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {!loading && versions.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">No versions yet. Create one to start tracking history.</p>
            )}

            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                        v{v.versionNumber}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{v.message}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-3 shrink-0">
                    <button
                      onClick={() => handleViewDiff(v)}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      View Diff
                    </button>
                    <button
                      onClick={() => handleRestore(v.id)}
                      disabled={restoringId !== null}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {restoringId === v.id ? 'Restoring…' : 'Restore'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Diff Modal */}
      {diffVersions && (
        <DiffModal
          projectId={projectId}
          fromVersionId={diffVersions.from}
          toVersionId={diffVersions.to}
          onClose={() => setDiffVersions(null)}
        />
      )}
    </>
  )
}
