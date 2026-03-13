import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import useErdStore from '../stores/erdStore'

function resetStore() {
  useErdStore.setState({
    present: { tables: [], relationships: [] },
    past: [],
    future: [],
    isDirty: false,
    projectId: null,
    projectName: '',
    projectDescription: '',
  })
}

describe('erdStore', () => {
  beforeEach(() => {
    resetStore()
  })

  it('addTable pushes to history and sets isDirty', () => {
    act(() => useErdStore.getState().addTable())
    const state = useErdStore.getState()
    expect(state.present.tables).toHaveLength(1)
    expect(state.past).toHaveLength(1)
    expect(state.past[0].tables).toHaveLength(0)
    expect(state.isDirty).toBe(true)
  })

  it('addTable creates table with correct default structure', () => {
    act(() => useErdStore.getState().addTable())
    const table = useErdStore.getState().present.tables[0]
    expect(table.id).toBeTruthy()
    expect(table.columns).toHaveLength(1)
    expect(table.columns[0].primaryKey).toBe(true)
    expect(table.columns[0].autoIncrement).toBe(true)
    expect(table.color).toBe('#6366f1')
  })

  it('undo restores previous state', () => {
    act(() => useErdStore.getState().addTable())
    act(() => useErdStore.getState().undo())
    const state = useErdStore.getState()
    expect(state.present.tables).toHaveLength(0)
    expect(state.past).toHaveLength(0)
    expect(state.future).toHaveLength(1)
  })

  it('redo re-applies undone state', () => {
    act(() => useErdStore.getState().addTable())
    act(() => useErdStore.getState().undo())
    act(() => useErdStore.getState().redo())
    const state = useErdStore.getState()
    expect(state.present.tables).toHaveLength(1)
    expect(state.future).toHaveLength(0)
  })

  it('new action clears future', () => {
    act(() => useErdStore.getState().addTable())
    act(() => useErdStore.getState().undo())
    act(() => useErdStore.getState().addTable())
    const state = useErdStore.getState()
    expect(state.future).toHaveLength(0)
  })

  it('history is capped at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      act(() => useErdStore.getState().addTable())
    }
    const state = useErdStore.getState()
    expect(state.past.length).toBeLessThanOrEqual(50)
  })

  it('save sets isDirty to false and returns present', () => {
    act(() => useErdStore.getState().addTable())
    expect(useErdStore.getState().isDirty).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = null
    act(() => { result = useErdStore.getState().save() })
    expect(useErdStore.getState().isDirty).toBe(false)
    expect(result).not.toBeNull()
    expect(result.tables).toHaveLength(1)
  })

  it('load resets all state', () => {
    act(() => useErdStore.getState().addTable())
    const erdData = { tables: [], relationships: [] }
    act(() => useErdStore.getState().load(1, 'Test', 'desc', erdData))
    const state = useErdStore.getState()
    expect(state.past).toHaveLength(0)
    expect(state.future).toHaveLength(0)
    expect(state.isDirty).toBe(false)
    expect(state.projectId).toBe(1)
  })

  it('canUndo and canRedo reflect state correctly', () => {
    expect(useErdStore.getState().canUndo()).toBe(false)
    expect(useErdStore.getState().canRedo()).toBe(false)
    act(() => useErdStore.getState().addTable())
    expect(useErdStore.getState().canUndo()).toBe(true)
    act(() => useErdStore.getState().undo())
    expect(useErdStore.getState().canRedo()).toBe(true)
  })

  it('removeTable also removes related relationships', () => {
    act(() => useErdStore.getState().addTable())
    act(() => useErdStore.getState().addTable())
    const { present } = useErdStore.getState()
    const t1 = present.tables[0].id
    const t2 = present.tables[1].id
    act(() => useErdStore.getState().addRelationship({
      sourceTableId: t1,
      sourceColumnName: 'id',
      targetTableId: t2,
      targetColumnName: 'id',
      type: 'one-to-many',
    }))
    expect(useErdStore.getState().present.relationships).toHaveLength(1)
    act(() => useErdStore.getState().removeTable(t1))
    expect(useErdStore.getState().present.relationships).toHaveLength(0)
  })
})
