import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { ErdData, ErdTable, ColumnMetadata, ErdRelationship } from '../types/erd'

const MAX_HISTORY = 50

interface ErdState {
  present: ErdData
  past: ErdData[]
  future: ErdData[]
  isDirty: boolean
  projectId: number | null
  projectName: string
  projectDescription: string

  load: (projectId: number, name: string, description: string, data: ErdData) => void
  save: () => ErdData
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  addTable: () => void
  removeTable: (tableId: string) => void
  updateTableName: (tableId: string, name: string) => void
  moveTable: (tableId: string, x: number, y: number) => void

  addColumn: (tableId: string) => void
  removeColumn: (tableId: string, columnName: string) => void
  updateColumn: (tableId: string, columnIndex: number, col: ColumnMetadata) => void

  addRelationship: (rel: Omit<ErdRelationship, 'id'>) => void
  removeRelationship: (relId: string) => void

  autoLayout: () => void
}

function emptyErd(): ErdData {
  return { tables: [], relationships: [] }
}

function pushHistory(past: ErdData[], present: ErdData): ErdData[] {
  const next = [...past, present]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

const useErdStore = create<ErdState>((set, get) => ({
  present: emptyErd(),
  past: [],
  future: [],
  isDirty: false,
  projectId: null,
  projectName: '',
  projectDescription: '',

  load: (projectId, name, description, data) => {
    set({ projectId, projectName: name, projectDescription: description, present: data, past: [], future: [], isDirty: false })
  },

  save: () => {
    set({ isDirty: false })
    return get().present
  },

  undo: () => {
    const { past, present, future } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      present: previous,
      future: [present, ...future],
      isDirty: true,
    })
  },

  redo: () => {
    const { past, present, future } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      past: pushHistory(past, present),
      present: next,
      future: future.slice(1),
      isDirty: true,
    })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addTable: () => {
    const { present, past } = get()
    const newTable: ErdTable = {
      id: uuidv4(),
      name: 'new_table',
      x: 100 + present.tables.length * 50,
      y: 100 + present.tables.length * 50,
      color: '#6366f1',
      columns: [{ name: 'id', type: 'INT', nullable: false, primaryKey: true, autoIncrement: true, unique: true, defaultValue: null }],
      indexes: [],
    }
    set({
      past: pushHistory(past, present),
      present: { ...present, tables: [...present.tables, newTable] },
      future: [],
      isDirty: true,
    })
  },

  removeTable: (tableId) => {
    const { present, past } = get()
    set({
      past: pushHistory(past, present),
      present: {
        tables: present.tables.filter((t) => t.id !== tableId),
        relationships: present.relationships.filter(
          (r) => r.sourceTableId !== tableId && r.targetTableId !== tableId
        ),
      },
      future: [],
      isDirty: true,
    })
  },

  updateTableName: (tableId, name) => {
    const { present, past } = get()
    set({
      past: pushHistory(past, present),
      present: {
        ...present,
        tables: present.tables.map((t) => (t.id === tableId ? { ...t, name } : t)),
      },
      future: [],
      isDirty: true,
    })
  },

  moveTable: (tableId, x, y) => {
    const { present } = get()
    set({
      present: {
        ...present,
        tables: present.tables.map((t) => (t.id === tableId ? { ...t, x, y } : t)),
      },
      isDirty: true,
    })
  },

  addColumn: (tableId) => {
    const { present, past } = get()
    const newCol: ColumnMetadata = {
      name: 'column',
      type: 'VARCHAR',
      length: 255,
      nullable: true,
      primaryKey: false,
      autoIncrement: false,
      unique: false,
      defaultValue: null,
    }
    set({
      past: pushHistory(past, present),
      present: {
        ...present,
        tables: present.tables.map((t) =>
          t.id === tableId ? { ...t, columns: [...t.columns, newCol] } : t
        ),
      },
      future: [],
      isDirty: true,
    })
  },

  removeColumn: (tableId, columnName) => {
    const { present, past } = get()
    set({
      past: pushHistory(past, present),
      present: {
        ...present,
        tables: present.tables.map((t) =>
          t.id === tableId
            ? { ...t, columns: t.columns.filter((c) => c.name !== columnName) }
            : t
        ),
      },
      future: [],
      isDirty: true,
    })
  },

  updateColumn: (tableId, columnIndex, col) => {
    const { present, past } = get()
    set({
      past: pushHistory(past, present),
      present: {
        ...present,
        tables: present.tables.map((t) => {
          if (t.id !== tableId) return t
          const cols = [...t.columns]
          cols[columnIndex] = col
          return { ...t, columns: cols }
        }),
      },
      future: [],
      isDirty: true,
    })
  },

  addRelationship: (rel) => {
    const { present, past } = get()
    set({
      past: pushHistory(past, present),
      present: {
        ...present,
        relationships: [...present.relationships, { ...rel, id: uuidv4() }],
      },
      future: [],
      isDirty: true,
    })
  },

  removeRelationship: (relId) => {
    const { present, past } = get()
    set({
      past: pushHistory(past, present),
      present: {
        ...present,
        relationships: present.relationships.filter((r) => r.id !== relId),
      },
      future: [],
      isDirty: true,
    })
  },

  autoLayout: () => {
    const { present, past } = get()
    const { tables, relationships } = present

    const inDegree: Record<string, number> = {}
    const adj: Record<string, string[]> = {}
    for (const t of tables) {
      inDegree[t.id] = 0
      adj[t.id] = []
    }
    for (const rel of relationships) {
      inDegree[rel.targetTableId] = (inDegree[rel.targetTableId] ?? 0) + 1
      adj[rel.sourceTableId] = [...(adj[rel.sourceTableId] ?? []), rel.targetTableId]
    }

    const levels: string[][] = []
    const visited = new Set<string>()
    const queue = tables.filter((t) => inDegree[t.id] === 0).map((t) => t.id)

    while (queue.length > 0) {
      const level: string[] = []
      const nextQueue: string[] = []
      for (const id of queue) {
        if (!visited.has(id)) {
          visited.add(id)
          level.push(id)
          for (const neighbor of adj[id] ?? []) {
            nextQueue.push(neighbor)
          }
        }
      }
      if (level.length > 0) levels.push(level)
      queue.splice(0, queue.length, ...nextQueue)
    }

    const unvisited = tables.filter((t) => !visited.has(t.id)).map((t) => t.id)
    if (unvisited.length > 0) levels.push(unvisited)

    const COL_GAP = 300
    const ROW_GAP = 200
    const posMap: Record<string, { x: number; y: number }> = {}
    for (let row = 0; row < levels.length; row++) {
      const level = levels[row]
      for (let col = 0; col < level.length; col++) {
        posMap[level[col]] = { x: col * COL_GAP + 50, y: row * ROW_GAP + 50 }
      }
    }

    set({
      past: pushHistory(past, present),
      present: {
        ...present,
        tables: tables.map((t) => ({ ...t, ...(posMap[t.id] ?? {}) })),
      },
      future: [],
      isDirty: true,
    })
  },
}))

export default useErdStore
