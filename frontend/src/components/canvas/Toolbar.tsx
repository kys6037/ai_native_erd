interface Props {
  onAddTable: () => void
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onAutoLayout: () => void
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  isSaving?: boolean
}

export default function Toolbar({
  onAddTable,
  onSave,
  onUndo,
  onRedo,
  onAutoLayout,
  canUndo,
  canRedo,
  isDirty,
  isSaving,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onAddTable}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        + Table
      </button>
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
      >
        ↩ Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
      >
        ↪ Redo
      </button>
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
      <button
        onClick={onAutoLayout}
        title="Auto-layout (Ctrl+A)"
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        Auto-layout
      </button>
      <div className="flex-1" />
      <button
        onClick={onSave}
        disabled={!isDirty || isSaving}
        title="Save (Ctrl+S)"
        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-40"
      >
        {isSaving ? 'Saving…' : isDirty ? 'Save*' : 'Saved'}
      </button>
    </div>
  )
}
