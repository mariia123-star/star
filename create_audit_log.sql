-- Создание системы логирования изменений на портале STAR
-- Эта таблица будет записывать все изменения и редактирования

-- Таблица логов действий пользователей
CREATE TABLE IF NOT EXISTS public.portal_audit_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid,  -- NULL если пользователь не авторизован
    session_id text,  -- Идентификатор сессии браузера
    action_type character varying(50) NOT NULL,  -- create, update, delete, view, export, import
    table_name character varying(100) NOT NULL,  -- Имя таблицы
    record_id uuid,  -- ID записи (если применимо)
    old_values jsonb,  -- Старые значения (для update/delete)
    new_values jsonb,  -- Новые значения (для create/update)
    changes_summary text,  -- Краткое описание изменений
    page_url text,  -- URL страницы где произошло действие
    user_agent text,  -- Браузер пользователя
    ip_address inet,  -- IP адрес
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT portal_audit_log_pkey PRIMARY KEY (id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS portal_audit_log_user_id_idx ON public.portal_audit_log(user_id);
CREATE INDEX IF NOT EXISTS portal_audit_log_action_type_idx ON public.portal_audit_log(action_type);
CREATE INDEX IF NOT EXISTS portal_audit_log_table_name_idx ON public.portal_audit_log(table_name);
CREATE INDEX IF NOT EXISTS portal_audit_log_record_id_idx ON public.portal_audit_log(record_id);
CREATE INDEX IF NOT EXISTS portal_audit_log_created_at_idx ON public.portal_audit_log(created_at DESC);

-- Комментарии
COMMENT ON TABLE public.portal_audit_log IS 'Журнал всех действий пользователей на портале STAR';
COMMENT ON COLUMN public.portal_audit_log.action_type IS 'Тип действия: create, update, delete, view, export, import, login, logout';
COMMENT ON COLUMN public.portal_audit_log.table_name IS 'Имя таблицы или раздела портала';
COMMENT ON COLUMN public.portal_audit_log.old_values IS 'Старые значения полей в формате JSON';
COMMENT ON COLUMN public.portal_audit_log.new_values IS 'Новые значения полей в формате JSON';
COMMENT ON COLUMN public.portal_audit_log.changes_summary IS 'Человекочитаемое описание изменений';

-- Функция для автоматического логирования изменений в основных таблицах
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger AS $$
BEGIN
    -- Логируем операции INSERT
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.portal_audit_log (
            action_type,
            table_name,
            record_id,
            new_values,
            changes_summary
        ) VALUES (
            'create',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(NEW),
            'Создана новая запись в таблице ' || TG_TABLE_NAME
        );
        RETURN NEW;
    END IF;

    -- Логируем операции UPDATE
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.portal_audit_log (
            action_type,
            table_name,
            record_id,
            old_values,
            new_values,
            changes_summary
        ) VALUES (
            'update',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            'Обновлена запись в таблице ' || TG_TABLE_NAME
        );
        RETURN NEW;
    END IF;

    -- Логируем операции DELETE
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.portal_audit_log (
            action_type,
            table_name,
            record_id,
            old_values,
            changes_summary
        ) VALUES (
            'delete',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD),
            'Удалена запись из таблицы ' || TG_TABLE_NAME
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггеры на основные таблицы
DROP TRIGGER IF EXISTS audit_trigger_rates ON public.rates;
CREATE TRIGGER audit_trigger_rates
    AFTER INSERT OR UPDATE OR DELETE ON public.rates
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger_materials ON public.materials;
CREATE TRIGGER audit_trigger_materials
    AFTER INSERT OR UPDATE OR DELETE ON public.materials
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger_tender_estimates ON public.tender_estimates;
CREATE TRIGGER audit_trigger_tender_estimates
    AFTER INSERT OR UPDATE OR DELETE ON public.tender_estimates
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger_units ON public.units;
CREATE TRIGGER audit_trigger_units
    AFTER INSERT OR UPDATE OR DELETE ON public.units
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Если есть таблица rate_materials_mapping, добавляем и на неё
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rate_materials_mapping') THEN
        DROP TRIGGER IF EXISTS audit_trigger_rate_materials_mapping ON public.rate_materials_mapping;
        CREATE TRIGGER audit_trigger_rate_materials_mapping
            AFTER INSERT OR UPDATE OR DELETE ON public.rate_materials_mapping
            FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
    END IF;
END $$;