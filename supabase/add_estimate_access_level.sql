-- Добавление поля прав доступа к сметам
ALTER TABLE estimate_drafts
ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'private'
CHECK (access_level IN ('private', 'team', 'public'));

COMMENT ON COLUMN estimate_drafts.access_level IS 'Права доступа: private - только автор, team - команда проекта, public - все пользователи';
