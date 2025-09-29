-- Таблица для хранения черновиков смет
CREATE TABLE IF NOT EXISTS estimate_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL, -- Хранит всю структуру позиций сметы
    status VARCHAR(50) DEFAULT 'draft',
    total_amount NUMERIC(15,2),
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_estimate_drafts_project ON estimate_drafts(project_id);
CREATE INDEX IF NOT EXISTS idx_estimate_drafts_status ON estimate_drafts(status);
CREATE INDEX IF NOT EXISTS idx_estimate_drafts_created_at ON estimate_drafts(created_at DESC);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_estimate_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_estimate_drafts_updated_at
    BEFORE UPDATE ON estimate_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_estimate_drafts_updated_at();

-- Комментарии к таблице
COMMENT ON TABLE estimate_drafts IS 'Черновики смет для временного сохранения';
COMMENT ON COLUMN estimate_drafts.data IS 'JSON структура со всеми позициями сметы';
COMMENT ON COLUMN estimate_drafts.status IS 'Статус черновика: draft, saved, converted';