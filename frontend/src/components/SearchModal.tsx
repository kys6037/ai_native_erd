import { useState, useEffect, useRef } from 'react'
import type { ErdTable } from '../types/erd'

interface Result {
  type: 'table' | 'column'
  tableId: string
  tableName: string
  columnName?: string
  label: string
}

interface Props {
  tables: ErdTable[]
  onClose: () => void
  onSelect: (tableId: string) => void
}

export default function SearchModal({ tables, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      setResults([])
      return
    }
    const found: Result[] = []
    for (const t of tables) {
      if (t.name.toLowerCase().includes(q)) {
        found.push({ type: 'table', tableId: t.id, tableName: t.name, label: t.name })
      }
      for (const c of t.columns) {
        if (c.name.toLowerCase().includes(q)) {
          found.push({ type: 'column', tableId: t.id, tableName: t.name, columnName: c.name, label: `${t.name}.${c.name}` })
        }
      }
      if (found.length >= 10) break
    }
    setResults(found.slice(0, 10))
    setActiveIdx(0)
  }, [query, tables])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIdx]) {
      onSelect(results[activeIdx].tableId)
      onClose()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-24">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
          <span className="text-gray-400 mr-2">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="테이블 또는 컬럼 검색..."
            className="flex-1 py-4 text-sm bg-transparent text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm">Esc</button>
        </div>

        {results.length > 0 ? (
          <ul className="max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <li
                key={`${r.tableId}-${r.columnName ?? ''}`}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer text-sm ${
                  i === activeIdx ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => { onSelect(r.tableId); onClose() }}
              >
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  r.type === 'table'
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                    : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                }`}>
                  {r.type === 'table' ? 'TABLE' : 'COL'}
                </span>
                <span className="text-gray-900 dark:text-white">{r.label}</span>
                {r.type === 'column' && (
                  <span className="text-gray-400 text-xs ml-auto">{r.tableName}</span>
                )}
              </li>
            ))}
          </ul>
        ) : query.trim() ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">결과 없음</div>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-400">테이블 또는 컬럼 이름으로 검색하세요</div>
        )}
      </div>
    </div>
  )
}
