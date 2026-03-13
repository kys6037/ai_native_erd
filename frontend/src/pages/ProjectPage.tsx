import { useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, updateProject } from '../api/projectApi'
import useErdStore from '../stores/erdStore'
import Toolbar from '../components/canvas/Toolbar'
import ErdCanvas from '../components/canvas/ErdCanvas'
import Sidebar from '../components/canvas/Sidebar'
import type { ErdTable } from '../types/erd'

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
  } = useErdStore()

  const [selectedTable, setSelectedTable] = useState<ErdTable | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

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
    } catch {
      // Could show a toast here
    } finally {
      setIsSaving(false)
    }
  }, [projectId, save, projectName, projectDescription])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        autoLayout()
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
      />

      <div className="flex flex-1 overflow-hidden">
        <ErdCanvas onSelectTable={setSelectedTable} />
        <Sidebar table={selectedTable} onClose={() => setSelectedTable(null)} />
      </div>
    </div>
  )
}
