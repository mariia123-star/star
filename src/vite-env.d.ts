/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_STORAGE_BUCKET: string
  readonly VITE_MAX_FILE_SIZE: string
  readonly VITE_IMPORT_BATCH_SIZE: string
  readonly VITE_RENDER_BATCH_SIZE: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_GRAFANA_CLOUD_URL: string
  readonly VITE_ENABLE_REALTIME: string
  readonly VITE_ENABLE_OFFLINE: string
  readonly VITE_DEV_HOST: string
  readonly VITE_DEV_PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Этот файл содержит только типы для Vite окружения
// Глобальные браузерные типы доступны автоматически в TypeScript
