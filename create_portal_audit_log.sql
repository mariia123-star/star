-- =====================================================
-- Создание таблицы portal_audit_log для логирования действий пользователей
-- =====================================================

-- Создаем таблицу для хранения логов действий пользователей
CREATE TABLE IF NOT EXISTS public.portal_audit_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id text,
    session_id text,
    action_type text NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'view', 'export', 'import', 'login', 'logout', 'navigate')),
    table_name text NOT NULL,
    record_id text,
    old_values jsonb,
    new_values jsonb,
    changes_summary text,
    page_url text,
    user_agent text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT portal_audit_log_pkey PRIMARY KEY (id)
);

-- Добавляем комментарии
COMMENT ON TABLE public.portal_audit_log IS 'Журнал аудита действий пользователей на портале';
COMMENT ON COLUMN public.portal_audit_log.user_id IS 'ID пользователя (если авторизован)';
COMMENT ON COLUMN public.portal_audit_log.session_id IS 'ID сессии браузера';
COMMENT ON COLUMN public.portal_audit_log.action_type IS 'Тип действия (create, update, delete, view, export, import, login, logout, navigate)';
COMMENT ON COLUMN public.portal_audit_log.table_name IS 'Название таблицы/сущности';
COMMENT ON COLUMN public.portal_audit_log.record_id IS 'ID записи (если применимо)';
COMMENT ON COLUMN public.portal_audit_log.old_values IS 'Старые значения (для update/delete)';
COMMENT ON COLUMN public.portal_audit_log.new_values IS 'Новые значения (для create/update)';
COMMENT ON COLUMN public.portal_audit_log.changes_summary IS 'Краткое описание изменений';
COMMENT ON COLUMN public.portal_audit_log.page_url IS 'URL страницы где произошло действие';
COMMENT ON COLUMN public.portal_audit_log.user_agent IS 'User-Agent браузера';
COMMENT ON COLUMN public.portal_audit_log.ip_address IS 'IP адрес пользователя';
COMMENT ON COLUMN public.portal_audit_log.created_at IS 'Дата и время действия';

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_portal_audit_log_user_id ON public.portal_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_audit_log_session_id ON public.portal_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_portal_audit_log_action_type ON public.portal_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_portal_audit_log_table_name ON public.portal_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_portal_audit_log_record_id ON public.portal_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_portal_audit_log_created_at ON public.portal_audit_log(created_at DESC);

-- Создаем составной индекс для популярных запросов
CREATE INDEX IF NOT EXISTS idx_portal_audit_log_table_record ON public.portal_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_portal_audit_log_user_action ON public.portal_audit_log(user_id, action_type);

-- Отключаем RLS согласно требованиям проекта
ALTER TABLE public.portal_audit_log DISABLE ROW LEVEL SECURITY;

-- Проверяем результат
SELECT
    'Таблица portal_audit_log успешно создана' as message,
    COUNT(*) as records_count
FROM public.portal_audit_log;
