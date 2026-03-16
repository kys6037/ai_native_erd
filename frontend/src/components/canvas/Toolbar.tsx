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

function userInitials(name: string | undefined): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-sky-500',
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
    <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#161b22] border-b border-slate-200 dark:border-[#30363d] h-11">
      <button
        onClick={onAddTable}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Table
      </button>

      <div className="w-px h-4 bg-slate-200 dark:bg-[#30363d] mx-1" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] disabled:opacity-30 transition-colors"
      >
        Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] disabled:opacity-30 transition-colors"
      >
        Redo
      </button>

      <div className="w-px h-4 bg-slate-200 dark:bg-[#30363d] mx-1" />

      <button
        onClick={onAutoLayout}
        title="Auto-layout (Ctrl+A)"
        className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
      >
        Auto Layout
      </button>

      <div className="w-px h-4 bg-slate-200 dark:bg-[#30363d] mx-1" />

      <button
        onClick={onImport}
        className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
      >
        Import
      </button>
      <button
        onClick={onExport}
        className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
      >
        Export
      </button>

      <div className="w-px h-4 bg-slate-200 dark:bg-[#30363d] mx-1" />

      <button
        onClick={onVersions}
        className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
      >
        History
      </button>
      <button
        onClick={onDictionary}
        className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
      >
        Dictionary
      </button>

      <div className="flex-1" />

      {/* Collaboration status */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
        {users.length > 0 && (
          <div className="flex -space-x-1.5">
            {users.slice(0, 5).map((u, i) => (
              <div
                key={u.userId}
                title={u.userName}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-white dark:ring-[#161b22] ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
              >
                {userInitials(u.userName)}
              </div>
            ))}
            {users.length > 5 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-400 dark:bg-slate-600 text-white text-[10px] font-medium ring-2 ring-white dark:ring-[#161b22]">
                +{users.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 dark:bg-[#30363d] mx-1" />

      <button
        onClick={onSave}
        disabled={!isDirty || isSaving}
        title="Save (Ctrl+S)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white disabled:opacity-30 transition-colors"
      >
        {isSaving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
        {isDirty && !isSaving && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
      </button>
    </div>
  )
}
