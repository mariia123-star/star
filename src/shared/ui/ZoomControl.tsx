/**
 * Компонент управления масштабом интерфейса
 */

import { Select, Tooltip } from 'antd'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { useZoomStore, ZOOM_OPTIONS } from '@/shared/store/zoom-store'

interface ZoomControlProps {
  showLabel?: boolean
  size?: 'small' | 'middle' | 'large'
}

export const ZoomControl = ({
  showLabel = true,
  size = 'middle',
}: ZoomControlProps) => {
  const { zoom, setZoom, resetZoom } = useZoomStore()

  const handleZoomChange = (value: number) => {
    console.log('👤 Пользователь изменил масштаб', {
      action: 'user_zoom_change',
      oldZoom: zoom,
      newZoom: value,
      timestamp: new Date().toISOString(),
    })
    setZoom(value as any)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {showLabel && (
        <span style={{ fontSize: 14, color: '#666', whiteSpace: 'nowrap' }}>
          Масштаб:
        </span>
      )}

      <Tooltip title="Уменьшить масштаб">
        <ZoomOut
          size={18}
          style={{
            cursor: 'pointer',
            color: zoom <= 75 ? '#ccc' : '#1890ff',
          }}
          onClick={() => {
            const currentIndex = ZOOM_OPTIONS.findIndex((o) => o.value === zoom)
            if (currentIndex > 0) {
              setZoom(ZOOM_OPTIONS[currentIndex - 1].value)
            }
          }}
        />
      </Tooltip>

      <Select
        value={zoom}
        onChange={handleZoomChange}
        size={size}
        style={{ width: 180 }}
        options={ZOOM_OPTIONS}
        popupMatchSelectWidth={false}
      />

      <Tooltip title="Увеличить масштаб">
        <ZoomIn
          size={18}
          style={{
            cursor: 'pointer',
            color: zoom >= 150 ? '#ccc' : '#1890ff',
          }}
          onClick={() => {
            const currentIndex = ZOOM_OPTIONS.findIndex((o) => o.value === zoom)
            if (currentIndex < ZOOM_OPTIONS.length - 1) {
              setZoom(ZOOM_OPTIONS[currentIndex + 1].value)
            }
          }}
        />
      </Tooltip>

      <Tooltip title="Сбросить масштаб (100%)">
        <RotateCcw
          size={16}
          style={{
            cursor: 'pointer',
            color: zoom === 100 ? '#ccc' : '#1890ff',
          }}
          onClick={resetZoom}
        />
      </Tooltip>
    </div>
  )
}
