'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function toYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTanggal(dateValue) {
  if (!dateValue) return '-'
  const [y, m, d] = String(dateValue).split('-')
  if (!y || !m || !d) return String(dateValue)
  return `${d}/${m}/${y}`
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export default function DashboardMiniCalendar() {
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()))
  const [loading, setLoading] = useState(true)
  const [agendaByDate, setAgendaByDate] = useState({})
  const [selectedDate, setSelectedDate] = useState(() => toYmd(new Date()))

  const todayYmd = useMemo(() => toYmd(new Date()), [])

  const monthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(monthDate)
    } catch {
      return `${monthDate.getMonth() + 1}/${monthDate.getFullYear()}`
    }
  }, [monthDate])

  const loadAgendaMonth = useCallback(async () => {
    setLoading(true)
    try {
      const start = toYmd(startOfMonth(monthDate))
      const end = toYmd(endOfMonth(monthDate))

      const { data, error } = await supabase
        .from('agenda_humas')
        .select('id,tanggal,nama_kegiatan,status')
        .eq('is_active', true)
        .gte('tanggal', start)
        .lte('tanggal', end)
        .order('tanggal', { ascending: true })

      if (error) {
        console.error('Error loading agenda month:', error)
        setAgendaByDate({})
        return
      }

      const grouped = {}
      ;(data || []).forEach((item) => {
        const key = item.tanggal
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(item)
      })

      setAgendaByDate(grouped)
    } finally {
      setLoading(false)
    }
  }, [monthDate])

  useEffect(() => {
    loadAgendaMonth()
  }, [loadAgendaMonth])

  const calendarCells = useMemo(() => {
    const first = startOfMonth(monthDate)
    const totalDays = endOfMonth(monthDate).getDate()

    // JS getDay(): 0=Sun..6=Sat. Convert to Monday-first index.
    const mondayIndex = (first.getDay() + 6) % 7 // 0=Mon..6=Sun

    const cells = []
    for (let i = 0; i < mondayIndex; i += 1) cells.push(null)
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day))
    }

    const rows = Math.ceil(cells.length / 7)
    const targetLen = rows * 7
    while (cells.length < targetLen) cells.push(null)

    return cells
  }, [monthDate])

  const selectedAgenda = useMemo(() => {
    return agendaByDate[selectedDate] || []
  }, [agendaByDate, selectedDate])

  const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Kalender Agenda</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1"
            onClick={() => setMonthDate((d) => addMonths(d, -1))}
            aria-label="Bulan sebelumnya"
          >
            ‹
          </button>
          <div className="text-sm font-medium text-secondary min-w-[140px] text-center capitalize">
            {monthLabel}
          </div>
          <button
            type="button"
            className="btn-secondary px-3 py-1"
            onClick={() => setMonthDate((d) => addMonths(d, 1))}
            aria-label="Bulan berikutnya"
          >
            ›
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {weekdays.map((d) => (
            <div key={d} className="text-xs font-medium text-secondary text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((date, idx) => {
            if (!date) {
              return <div key={`blank-${idx}`} className="h-9" />
            }

            const ymd = toYmd(date)
            const hasAgenda = (agendaByDate[ymd]?.length || 0) > 0
            const isToday = ymd === todayYmd
            const isSelected = ymd === selectedDate

            const base = 'h-9 rounded-md text-sm flex items-center justify-center transition-colors'
            const normal = 'border border-gray-200 hover:border-primary/40'
            const agendaMark = hasAgenda ? 'bg-primary/10 text-primary border-primary/30' : 'text-gray-900'
            const todayMark = isToday ? 'ring-2 ring-primary ring-offset-1' : ''
            const selectedMark = isSelected ? 'bg-primary text-white border-primary' : ''

            return (
              <button
                key={ymd}
                type="button"
                onClick={() => setSelectedDate(ymd)}
                className={[base, normal, agendaMark, todayMark, selectedMark].filter(Boolean).join(' ')}
                title={hasAgenda ? `${agendaByDate[ymd].length} agenda` : 'Tidak ada agenda'}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              Agenda {formatTanggal(selectedDate)}
            </h3>
            {loading && <span className="text-xs text-secondary">Memuat...</span>}
          </div>

          {!loading && selectedAgenda.length === 0 && (
            <p className="mt-2 text-sm text-secondary">Tidak ada agenda pada tanggal ini</p>
          )}

          {!loading && selectedAgenda.length > 0 && (
            <div className="mt-2 space-y-2">
              {selectedAgenda.map((a) => (
                <div key={a.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium text-gray-900">{a.nama_kegiatan}</div>
                    <span
                      className={
                        'text-xs px-2 py-0.5 rounded border ' +
                        (a.status === 'selesai'
                          ? 'text-secondary border-gray-200'
                          : 'text-primary border-primary/30 bg-primary/10')
                      }
                    >
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
