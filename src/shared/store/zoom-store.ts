/**
 * Store для управления масштабом интерфейса
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ZoomLevel = 75 | 80 | 85 | 90 | 95 | 100 | 110 | 125 | 150

interface ZoomState {
  zoom: ZoomLevel
  setZoom: (zoom: ZoomLevel) => void
  resetZoom: () => void
}

const DEFAULT_ZOOM: ZoomLevel = 100

export const useZoomStore = create<ZoomState>()(
  persist(
    (set) => ({
      zoom: DEFAULT_ZOOM,
      setZoom: (zoom) => {
        console.log('🔍 Изменение масштаба интерфейса', {
          action: 'set_zoom',
          newZoom: zoom,
          timestamp: new Date().toISOString(),
        })
        set({ zoom })
        // Применяем масштаб к body
        document.body.style.zoom = `${zoom}%`
      },
      resetZoom: () => {
        console.log('🔍 Сброс масштаба на 100%', {
          action: 'reset_zoom',
          timestamp: new Date().toISOString(),
        })
        set({ zoom: DEFAULT_ZOOM })
        document.body.style.zoom = '100%'
      },
    }),
    {
      name: 'star-zoom-storage',
      onRehydrateStorage: () => (state) => {
        // Применяем сохранённый масштаб при загрузке
        if (state) {
          document.body.style.zoom = `${state.zoom}%`
          console.log('🔍 Восстановлен сохранённый масштаб', {
            action: 'restore_zoom',
            zoom: state.zoom,
            timestamp: new Date().toISOString(),
          })
        }
      },
    }
  )
)

/**
 * Доступные опции масштаба для UI
 */
export const ZOOM_OPTIONS: { value: ZoomLevel; label: string }[] = [
  { value: 75, label: '75%' },
  { value: 80, label: '80%' },
  { value: 85, label: '85%' },
  { value: 90, label: '90%' },
  { value: 95, label: '95%' },
  { value: 100, label: '100% (По умолчанию)' },
  { value: 110, label: '110%' },
  { value: 125, label: '125%' },
  { value: 150, label: '150%' },
]
