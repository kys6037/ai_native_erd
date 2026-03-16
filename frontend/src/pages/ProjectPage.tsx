import { useEffect, useCallback, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, updateProject } from '../api/projectApi'
import useErdStore from '../stores/erdStore'
import useAuthStore from '../stores/authStore'
import Toolbar from '../components/canvas/Toolbar'
import ErdCanvas from '../components/canvas/ErdCanvas'
import Sidebar from '../components/canvas/Sidebar'
import ImportModal from '../components/ImportModal'
import ExportModal from '../components/ExportModal'
import VersionModal from '../components/VersionModal'
import DictionaryModal from '../components/DictionaryModal'
import SearchModal from '../components/SearchModal'
import InviteModal from '../components/InviteModal'
import { useCollaboration } from '../hooks/useCollaboration'
import type { ErdData, ErdTable } from '../types/erd'

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = id ? parseInt(id, 10) : null

  const {
    load,
    save,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
    addTable,
    autoLayout,
    present,
    projectName,
    projectDescription,
    loadFromVersion,
  } = useErdStore()

  const token = useAuthStore((s) => s.token)

  const [selectedTable, setSelectedTable] = useState<ErdTable | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  // Modal state
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showDictionary, setShowDictionary] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  // Collaboration
  const { connected, users, tableFocuses, syncToYjs, focusTable } = useCollaboration(
    projectId,
    token,
    (remoteData: ErdData) => {
      loadFromVersion(remoteData, false)
    }
  )

  useEffect(() => {
    if (!projectId) return
    getProject(projectId)
      .then((p) => load(p.id, p.name, p.description, p.erdData))
      .catch(() => setLoadError('Failed to load project'))
  }, [projectId, load])

  const handleSave = useCallback(async () => {
    if (!projectId) return
    setIsSaving(true)
    try {
      const data = save()
      await updateProject(projectId, projectName, projectDescription, data)
      syncToYjs(data)
    } catch {
      // silent fail — dirty state remains
    } finally {
      setIsSaving(false)
    }
  }, [projectId, save, projectName, projectDescription, syncToYjs])

  // Auto-save: 3s debounce after isDirty changes
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isDirty) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      handleSave()
    }, 3000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [isDirty, present, handleSave])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isInput) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !isInput) {
        e.preventDefault()
        redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isInput) {
        e.preventDefault()
        autoLayout()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, handleSave, autoLayout])

  // Keep selected table in sync with present
  useEffect(() => {
    if (selectedTable) {
      const updated = present.tables.find((t) => t.id === selectedTable.id) ?? null
      setSelectedTable(updated)
    }
  }, [present])

  const handleImport = (data: ErdData, mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      loadFromVersion(data)
    } else {
      const existingNames = new Set(present.tables.map((t) => t.name))
      const newTables = data.tables.filter((t) => !existingNames.has(t.name))
      loadFromVersion({
        tables: [...present.tables, ...newTables],
        relationships: [...present.relationships, ...data.relationships],
      })
    }
  }

  const handleRestored = (data: ErdData) => {
    loadFromVersion(data)
  }

  const handleSearchSelect = (tableId: string) => {
    const table = present.tables.find((t) => t.id === tableId) ?? null
    setSelectedTable(table)
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{loadError}</p>
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Dashboard
        </button>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{projectName}</h1>
        <button
          onClick={() => setShowSearch(true)}
          className="ml-auto flex items-center gap-2 text-xs text-gray-400 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          🔍 검색
          <kbd className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1 rounded text-xs">⌘K</kbd>
        </button>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-md px-3 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          🔗 초대
        </button>
      </div>

      <Toolbar
        onAddTable={addTable}
        onSave={handleSave}
        onUndo={undo}
        onRedo={redo}
        onAutoLayout={autoLayout}
        canUndo={canUndo()}
        canRedo={canRedo()}
        isDirty={isDirty}
        isSaving={isSaving}
        onImport={() => setShowImport(true)}
        onExport={() => setShowExport(true)}
        onVersions={() => setShowVersions(true)}
        onDictionary={() => setShowDictionary(true)}
        connected={connected}
        users={users}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <ErdCanvas
          onSelectTable={setSelectedTable}
          tableFocuses={tableFocuses}
          focusTable={focusTable}
        />

        {/* Empty state overlay */}
        {present.tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center pointer-events-auto">
              <p className="text-4xl mb-3">🗂️</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">아직 테이블이 없습니다</p>
              <button
                onClick={addTable}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + 테이블 추가
              </button>
            </div>
          </div>
        )}

        <Sidebar table={selectedTable} onClose={() => setSelectedTable(null)} />
      </div>

      {/* Modals */}
      {showInvite && projectId && (
        <InviteModal projectId={projectId} onClose={() => setShowInvite(false)} />
      )}

      {showSearch && (
        <SearchModal
          tables={present.tables}
          onClose={() => setShowSearch(false)}
          onSelect={handleSearchSelect}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          erdData={present}
          projectName={projectName}
        />
      )}

      {showVersions && projectId && (
        <VersionModal
          projectId={projectId}
          onClose={() => setShowVersions(false)}
          onRestored={handleRestored}
        />
      )}

      {showDictionary && projectId && (
        <DictionaryModal
          projectId={projectId}
          tables={present.tables}
          onClose={() => setShowDictionary(false)}
        />
      )}
    </div>
  )
}
