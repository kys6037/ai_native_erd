import { useState } from 'react'
import { generateDdl } from '../api/ddlApi'
import type { ErdData } from '../types/erd'

interface Props {
  onClose: () => void
  erdData: ErdData
  projectName: string
}

const DIALECTS = ['mysql', 'postgresql', 'oracle', 'mssql']

export default function ExportModal({ onClose, erdData, projectName }: Props) {
  const [dialect, setDialect] = useState('mysql')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleDownloadDdl = async () => {
    setLoading('ddl')
    setError('')
    try {
      const sql = await generateDdl(erdData, dialect)
      const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName.replace(/\s+/g, '_')}_${dialect}.sql`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate DDL'
      setError(msg)
    } finally {
      setLoading(null)
    }
  }

  const handleExportPng = async () => {
    setLoading('png')
    setError('')
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = document.querySelector('.react-flow') as HTMLElement | null
      if (!el) throw new Error('Canvas element not found')
      const canvas = await html2canvas(el, { scale: 2 })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName.replace(/\s+/g, '_')}.png`
      a.click()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to export PNG'
      setError(msg)
    } finally {
      setLoading(null)
    }
  }

  const handleExportPdf = async () => {
    setLoading('pdf')
    setError('')
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const el = document.querySelector('.react-flow') as HTMLElement | null
      if (!el) throw new Error('Canvas element not found')
      const canvas = await html2canvas(el, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save(`${projectName.replace(/\s+/g, '_')}.pdf`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to export PDF'
      setError(msg)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* DDL Export */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">DDL Export</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dialect</label>
              <select
                value={dialect}
                onChange={(e) => setDialect(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {DIALECTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleDownloadDdl}
              disabled={loading !== null}
              className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading === 'ddl' ? 'Generating…' : 'Download DDL (.sql)'}
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Image Export */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Image Export</h3>
            <button
              onClick={handleExportPng}
              disabled={loading !== null}
              className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {loading === 'png' ? 'Exporting…' : 'Export PNG'}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={loading !== null}
              className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {loading === 'pdf' ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
