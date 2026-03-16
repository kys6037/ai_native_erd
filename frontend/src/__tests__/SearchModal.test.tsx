import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchModal from '../components/SearchModal'
import type { ErdTable } from '../types/erd'

const tables: ErdTable[] = [
  {
    id: 't1',
    name: 'users',
    x: 0, y: 0,
    columns: [
      { id: 'c1', name: 'id', type: 'INT', primaryKey: true, notNull: true, unique: false, defaultValue: '', comment: '' },
      { id: 'c2', name: 'email', type: 'VARCHAR(255)', primaryKey: false, notNull: true, unique: true, defaultValue: '', comment: '' },
    ],
    comment: '',
    indexes: [],
  },
  {
    id: 't2',
    name: 'orders',
    x: 0, y: 0,
    columns: [
      { id: 'c3', name: 'user_id', type: 'INT', primaryKey: false, notNull: true, unique: false, defaultValue: '', comment: '' },
    ],
    comment: '',
    indexes: [],
  },
]

describe('SearchModal', () => {
  const onClose = vi.fn()
  const onSelect = vi.fn()

  beforeEach(() => {
    onClose.mockReset()
    onSelect.mockReset()
  })

  it('renders with focused input', () => {
    render(<SearchModal tables={tables} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByPlaceholderText(/검색/)).toBeInTheDocument()
  })

  it('shows table results matching query', async () => {
    render(<SearchModal tables={tables} onClose={onClose} onSelect={onSelect} />)
    await userEvent.type(screen.getByPlaceholderText(/검색/), 'user')
    expect(screen.getByText('users')).toBeInTheDocument()
  })

  it('shows column results matching query', async () => {
    render(<SearchModal tables={tables} onClose={onClose} onSelect={onSelect} />)
    await userEvent.type(screen.getByPlaceholderText(/검색/), 'email')
    expect(screen.getByText('users.email')).toBeInTheDocument()
  })

  it('shows empty state for no results', async () => {
    render(<SearchModal tables={tables} onClose={onClose} onSelect={onSelect} />)
    await userEvent.type(screen.getByPlaceholderText(/검색/), 'zzznomatch')
    expect(screen.getByText(/결과 없음/)).toBeInTheDocument()
  })

  it('calls onClose when Escape pressed', async () => {
    render(<SearchModal tables={tables} onClose={onClose} onSelect={onSelect} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onSelect and onClose when result clicked', async () => {
    render(<SearchModal tables={tables} onClose={onClose} onSelect={onSelect} />)
    await userEvent.type(screen.getByPlaceholderText(/검색/), 'orders')
    await userEvent.click(screen.getByText('orders'))
    expect(onSelect).toHaveBeenCalledWith('t2')
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Esc button clicked', async () => {
    render(<SearchModal tables={tables} onClose={onClose} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /esc/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
