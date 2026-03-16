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
      <div className="flex items-center gap-3 px-4 h-10 bg-white dark:bg-[#161b22] border-b border-slate-200 dark:border-[#30363d] shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3 6l4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </button>
        <div className="w-px h-3.5 bg-slate-200 dark:bg-[#30363d]" />
        <h1 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{projectName}</h1>
        <div className="flex-1" />
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#30363d] rounded px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-[#21262d] transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 8l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Search
          <kbd className="bg-slate-100 dark:bg-[#21262d] text-slate-400 dark:text-slate-500 px-1 rounded text-[10px] font-mono ml-0.5">⌘K</kbd>
        </button>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded px-2.5 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM1 10c0-2.2 1.8-4 4-4M10 8v3M8.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Invite
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
