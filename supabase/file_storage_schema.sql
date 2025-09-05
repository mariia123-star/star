-- ==========================================
-- Схема для хранения файлов в портале STAR
-- Дата создания: 2025-01-15
-- ==========================================

-- Enable необходимые расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Удаляем существующие таблицы (для пересоздания)
DROP TABLE IF EXISTS file_access_logs CASCADE;
DROP TABLE IF EXISTS file_tags_mapping CASCADE;
DROP TABLE IF EXISTS file_tags CASCADE;
DROP TABLE IF EXISTS file_versions CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS file_categories CASCADE;

-- ==========================================
-- 1. ОСНОВНЫЕ ТАБЛИЦЫ
-- ==========================================

-- Таблица категорий файлов
CREATE TABLE file_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50), -- Иконка для категории (например, 'file-text', 'image')
    color VARCHAR(7) DEFAULT '#1677ff', -- Цвет категории в HEX формате
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Основная таблица файлов (метаданные)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Основная информация
    original_filename VARCHAR(500) NOT NULL, -- Оригинальное имя файла
    display_name VARCHAR(500) NOT NULL, -- Отображаемое имя (может редактироваться)
    description TEXT, -- Описание файла
    
    -- Файловая информация
    file_extension VARCHAR(20) NOT NULL, -- Расширение файла (.pdf, .docx, etc.)
    mime_type VARCHAR(200) NOT NULL, -- MIME тип (application/pdf, image/jpeg, etc.)
    file_size BIGINT NOT NULL, -- Размер файла в байтах
    file_hash VARCHAR(64), -- SHA-256 хеш для проверки целостности
    
    -- Путь и хранение (для разных стратегий хранения)
    storage_type VARCHAR(20) DEFAULT 'local', -- 'local', 'supabase', 's3', 'azure'
    storage_path TEXT NOT NULL, -- Путь к файлу в хранилище
    storage_bucket VARCHAR(100), -- Bucket/контейнер (для облачных хранилищ)
    
    -- Категоризация
    category_id UUID REFERENCES file_categories(id) ON DELETE SET NULL,
    
    -- Права доступа
    is_public BOOLEAN DEFAULT FALSE, -- Публичный доступ
    access_level VARCHAR(20) DEFAULT 'private', -- 'public', 'internal', 'private', 'restricted'
    
    -- Метаданные
    metadata JSONB DEFAULT '{}', -- Дополнительные метаданные (EXIF, документ свойства и т.д.)
    
    -- Статус и версионирование
    version INTEGER DEFAULT 1, -- Версия файла
    is_latest_version BOOLEAN DEFAULT TRUE, -- Является ли текущей версией
    parent_file_id UUID REFERENCES files(id) ON DELETE SET NULL, -- Ссылка на родительский файл (для версий)
    
    -- Пользователи и проекты
    uploaded_by UUID, -- ID пользователя, который загрузил файл
    project_id UUID, -- Привязка к проекту (если есть)
    
    -- Технические поля
    download_count INTEGER DEFAULT 0, -- Количество скачиваний
    is_active BOOLEAN DEFAULT TRUE, -- Активность записи
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL -- Soft delete
);

-- Таблица версий файлов (история изменений)
CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Информация о версии
    original_filename VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64),
    storage_path TEXT NOT NULL,
    
    -- Изменения
    change_description TEXT, -- Описание изменений в версии
    uploaded_by UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(file_id, version_number)
);

-- Таблица тегов для файлов
CREATE TABLE file_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#87d068', -- Цвет тега
    description TEXT,
    usage_count INTEGER DEFAULT 0, -- Количество использований
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Связь файлов с тегами (many-to-many)
CREATE TABLE file_tags_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES file_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(file_id, tag_id)
);

-- Таблица логов доступа к файлам (для аудита и аналитики)
CREATE TABLE file_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID, -- ID пользователя (может быть NULL для анонимных)
    
    -- Информация о действии
    action VARCHAR(50) NOT NULL, -- 'view', 'download', 'upload', 'delete', 'update'
    ip_address INET, -- IP адрес пользователя
    user_agent TEXT, -- User-Agent браузера
    
    -- Дополнительная информация
    file_size_at_access BIGINT, -- Размер файла на момент доступа
    access_duration INTEGER, -- Длительность просмотра в секундах (для просмотра)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ==========================================

-- Индексы для таблицы files
CREATE INDEX idx_files_category_id ON files(category_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_is_active ON files(is_active);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
CREATE INDEX idx_files_file_extension ON files(file_extension);
CREATE INDEX idx_files_mime_type ON files(mime_type);
CREATE INDEX idx_files_is_latest_version ON files(is_latest_version);
CREATE INDEX idx_files_parent_file_id ON files(parent_file_id);
CREATE INDEX idx_files_storage_type ON files(storage_type);

-- Композитные индексы
CREATE INDEX idx_files_active_latest ON files(is_active, is_latest_version);
CREATE INDEX idx_files_category_active ON files(category_id, is_active);

-- Индексы для полнотекстового поиска
CREATE INDEX idx_files_search_name ON files USING gin(to_tsvector('russian', display_name));
CREATE INDEX idx_files_search_description ON files USING gin(to_tsvector('russian', description));

-- Индексы для связанных таблиц
CREATE INDEX idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX idx_file_versions_created_at ON file_versions(created_at DESC);
CREATE INDEX idx_file_tags_mapping_file_id ON file_tags_mapping(file_id);
CREATE INDEX idx_file_tags_mapping_tag_id ON file_tags_mapping(tag_id);
CREATE INDEX idx_file_access_logs_file_id ON file_access_logs(file_id);
CREATE INDEX idx_file_access_logs_user_id ON file_access_logs(user_id);
CREATE INDEX idx_file_access_logs_created_at ON file_access_logs(created_at DESC);
CREATE INDEX idx_file_access_logs_action ON file_access_logs(action);

-- ==========================================
-- 3. ТРИГГЕРЫ И ФУНКЦИИ
-- ==========================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Применяем триггеры updated_at
CREATE TRIGGER update_file_categories_updated_at 
    BEFORE UPDATE ON file_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at 
    BEFORE UPDATE ON files 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для обновления счетчика скачиваний
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action = 'download' THEN
        UPDATE files 
        SET download_count = download_count + 1 
        WHERE id = NEW.file_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Триггер для автоматического подсчета скачиваний
CREATE TRIGGER update_download_count_trigger
    AFTER INSERT ON file_access_logs
    FOR EACH ROW EXECUTE FUNCTION increment_download_count();

-- Функция для обновления счетчика использования тегов
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE file_tags 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE file_tags 
        SET usage_count = usage_count - 1 
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

-- Триггеры для обновления счетчика использования тегов
CREATE TRIGGER update_tag_usage_insert
    AFTER INSERT ON file_tags_mapping
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER update_tag_usage_delete
    AFTER DELETE ON file_tags_mapping
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- Функция для создания новой версии файла
CREATE OR REPLACE FUNCTION create_file_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Если это обновление файла (а не создание)
    IF TG_OP = 'UPDATE' AND (
        OLD.original_filename != NEW.original_filename OR 
        OLD.file_size != NEW.file_size OR 
        OLD.file_hash != NEW.file_hash
    ) THEN
        -- Создаем запись о предыдущей версии
        INSERT INTO file_versions (
            file_id, version_number, original_filename, 
            file_size, file_hash, storage_path, uploaded_by
        ) VALUES (
            OLD.id, OLD.version, OLD.original_filename,
            OLD.file_size, OLD.file_hash, OLD.storage_path, OLD.uploaded_by
        );
        
        -- Увеличиваем номер версии
        NEW.version = OLD.version + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Триггер для версионирования файлов
CREATE TRIGGER create_file_version_trigger
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION create_file_version();

-- ==========================================
-- 4. ПРЕДСТАВЛЕНИЯ (VIEWS)
-- ==========================================

-- Представление для файлов с категориями и тегами
CREATE VIEW v_files_with_details AS
SELECT 
    f.id,
    f.original_filename,
    f.display_name,
    f.description,
    f.file_extension,
    f.mime_type,
    f.file_size,
    f.storage_type,
    f.storage_path,
    f.version,
    f.is_latest_version,
    f.is_public,
    f.access_level,
    f.download_count,
    f.uploaded_by,
    f.project_id,
    f.created_at,
    f.updated_at,
    
    -- Информация о категории
    fc.name as category_name,
    fc.icon as category_icon,
    fc.color as category_color,
    
    -- Агрегированные теги
    COALESCE(
        string_agg(ft.name, ', ' ORDER BY ft.name), 
        ''
    ) as tags,
    
    -- Количество версий
    COALESCE(fv.version_count, 0) as total_versions,
    
    -- Последний доступ
    fal.last_access,
    fal.last_action
    
FROM files f
LEFT JOIN file_categories fc ON f.category_id = fc.id
LEFT JOIN file_tags_mapping ftm ON f.id = ftm.file_id
LEFT JOIN file_tags ft ON ftm.tag_id = ft.id
LEFT JOIN (
    SELECT 
        file_id, 
        COUNT(*) as version_count 
    FROM file_versions 
    GROUP BY file_id
) fv ON f.id = fv.file_id
LEFT JOIN (
    SELECT DISTINCT ON (file_id) 
        file_id, 
        created_at as last_access,
        action as last_action
    FROM file_access_logs 
    ORDER BY file_id, created_at DESC
) fal ON f.id = fal.file_id

WHERE f.is_active = TRUE AND f.deleted_at IS NULL
GROUP BY 
    f.id, f.original_filename, f.display_name, f.description,
    f.file_extension, f.mime_type, f.file_size, f.storage_type, f.storage_path,
    f.version, f.is_latest_version, f.is_public, f.access_level, f.download_count,
    f.uploaded_by, f.project_id, f.created_at, f.updated_at,
    fc.name, fc.icon, fc.color, fv.version_count, fal.last_access, fal.last_action;

-- Представление статистики по файлам
CREATE VIEW v_file_statistics AS
SELECT 
    COUNT(*) as total_files,
    COUNT(CASE WHEN is_public = TRUE THEN 1 END) as public_files,
    COUNT(CASE WHEN is_public = FALSE THEN 1 END) as private_files,
    SUM(file_size) as total_size_bytes,
    AVG(file_size) as avg_size_bytes,
    SUM(download_count) as total_downloads,
    COUNT(DISTINCT category_id) as categories_used,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as files_this_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as files_this_month
FROM files 
WHERE is_active = TRUE AND deleted_at IS NULL;

-- Представление популярных файлов
CREATE VIEW v_popular_files AS
SELECT 
    f.id,
    f.display_name,
    f.file_extension,
    f.download_count,
    fc.name as category_name,
    f.created_at,
    RANK() OVER (ORDER BY f.download_count DESC) as popularity_rank
FROM files f
LEFT JOIN file_categories fc ON f.category_id = fc.id
WHERE f.is_active = TRUE AND f.deleted_at IS NULL
ORDER BY f.download_count DESC
LIMIT 100;

-- ==========================================
-- 5. КОММЕНТАРИИ К ТАБЛИЦАМ И ПОЛЯМ
-- ==========================================

COMMENT ON TABLE file_categories IS 'Категории файлов для группировки и организации';
COMMENT ON TABLE files IS 'Основная таблица метаданных файлов';
COMMENT ON TABLE file_versions IS 'История версий файлов';
COMMENT ON TABLE file_tags IS 'Теги для маркировки и поиска файлов';
COMMENT ON TABLE file_tags_mapping IS 'Связь файлов с тегами (многие ко многим)';
COMMENT ON TABLE file_access_logs IS 'Лог доступа к файлам для аудита и аналитики';

-- Комментарии к ключевым полям
COMMENT ON COLUMN files.storage_type IS 'Тип хранилища: local, supabase, s3, azure';
COMMENT ON COLUMN files.access_level IS 'Уровень доступа: public, internal, private, restricted';
COMMENT ON COLUMN files.metadata IS 'JSON метаданные (EXIF, свойства документа и т.д.)';
COMMENT ON COLUMN files.file_hash IS 'SHA-256 хеш для проверки целостности файла';
COMMENT ON COLUMN file_access_logs.action IS 'Действие: view, download, upload, delete, update';