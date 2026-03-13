interface CollabUser {
  userId: number
  userName: string
}

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
  onImport: () => void
  onExport: () => void
  onVersions: () => void
  onDictionary: () => void
  connected: boolean
  users: CollabUser[]
}

function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_COLORS = [
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-cyan-500',
]

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
  onImport,
  onExport,
  onVersions,
  onDictionary,
  connected,
  users,
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
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
      <button
        onClick={onImport}
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        Import
      </button>
      <button
        onClick={onExport}
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        Export
      </button>
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
      <button
        onClick={onVersions}
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        Versions
      </button>
      <button
        onClick={onDictionary}
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        Dictionary
      </button>

      <div className="flex-1" />

      {/* Collaboration status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}
          title={connected ? 'Collaboration connected' : 'Not connected'}
        />
        {users.length > 0 && (
          <div className="flex -space-x-1">
            {users.slice(0, 5).map((u, i) => (
              <div
                key={u.userId}
                title={u.userName}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white dark:ring-gray-800 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
              >
                {userInitials(u.userName)}
              </div>
            ))}
            {users.length > 5 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-400 text-white text-xs font-medium ring-2 ring-white dark:ring-gray-800">
                +{users.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

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
