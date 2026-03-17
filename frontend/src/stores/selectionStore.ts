import { create } from 'zustand'

interface SelectionState {
  tableIds: string[]
  columnKeys: string[] // "tableId:colIdx"
  editingTableId: string | null
  editingColumnKey: string | null

  selectTable: (id: string, multi: boolean) => void
  selectColumn: (key: string, multi: boolean) => void
  setEditingTable: (id: string | null) => void
  setEditingColumn: (key: string | null) => void
  clearAll: () => void
}

const useSelectionStore = create<SelectionState>((set, get) => ({
  tableIds: [],
  columnKeys: [],
  editingTableId: null,
  editingColumnKey: null,

  selectTable: (id, multi) => {
    if (multi) {
      const { tableIds } = get()
      const has = tableIds.includes(id)
      set({ tableIds: has ? tableIds.filter((i) => i !== id) : [...tableIds, id] })
    } else {
      set({ tableIds: [id], columnKeys: [], editingColumnKey: null })
    }
  },

  selectColumn: (key, multi) => {
    if (multi) {
      const { columnKeys } = get()
      const has = columnKeys.includes(key)
      set({ columnKeys: has ? columnKeys.filter((k) => k !== key) : [...columnKeys, key] })
    } else {
      set({ columnKeys: [key], tableIds: [], editingTableId: null, editingColumnKey: null })
    }
  },

  setEditingTable: (id) => set({ editingTableId: id }),
  setEditingColumn: (key) => set({ editingColumnKey: key }),

  clearAll: () =>
    set({ tableIds: [], columnKeys: [], editingTableId: null, editingColumnKey: null }),
}))

export default useSelectionStore
