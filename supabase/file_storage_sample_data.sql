-- ==========================================
-- Примеры данных для системы хранения файлов
-- Выполнять ПОСЛЕ создания основной схемы
-- ==========================================

-- ==========================================
-- 1. КАТЕГОРИИ ФАЙЛОВ
-- ==========================================

INSERT INTO file_categories (name, description, icon, color) VALUES
('Документы', 'Текстовые документы, договоры, техническая документация', 'file-text', '#1677ff'),
('Изображения', 'Фотографии, схемы, диаграммы, логотипы', 'image', '#52c41a'),
('Архивы', 'ZIP, RAR архивы с документами и файлами', 'folder-zip', '#722ed1'),
('Таблицы', 'Excel, CSV файлы со статистикой и расчетами', 'table', '#13c2c2'),
('Презентации', 'PowerPoint презентации, доклады', 'presentation', '#fa541c'),
('PDF документы', 'PDF файлы различного назначения', 'file-pdf', '#eb2f96'),
('Видео', 'Обучающие видео, записи совещаний', 'video-camera', '#f5222d'),
('Аудио', 'Аудиозаписи, подкасты', 'audio', '#faad14'),
('Код', 'Исходный код, скрипты, конфигурации', 'code', '#2f54eb'),
('Прочее', 'Файлы не попадающие в другие категории', 'file', '#8c8c8c');

-- ==========================================
-- 2. ТЕГИ ДЛЯ ФАЙЛОВ
-- ==========================================

INSERT INTO file_tags (name, color, description) VALUES
('важно', '#ff4d4f', 'Важные и приоритетные файлы'),
('архив', '#d9d9d9', 'Архивные документы'),
('проект-альфа', '#1677ff', 'Файлы проекта Альфа'),
('проект-бета', '#52c41a', 'Файлы проекта Бета'),
('черновик', '#faad14', 'Черновики и незавершенные документы'),
('готово', '#52c41a', 'Готовые к использованию файлы'),
('на-согласовании', '#fa8c16', 'Файлы на стадии согласования'),
('конфиденциально', '#722ed1', 'Конфиденциальная информация'),
('общедоступно', '#13c2c2', 'Файлы для общего доступа'),
('инструкции', '#2f54eb', 'Инструкции и руководства'),
('отчет', '#eb2f96', 'Отчеты и аналитика'),
('шаблон', '#fa541c', 'Шаблоны документов'),
('обучение', '#389e0d', 'Обучающие материалы'),
('техдокументация', '#0958d9', 'Техническая документация'),
('финансы', '#d4b106', 'Финансовые документы');

-- ==========================================
-- 3. ПРИМЕРЫ ФАЙЛОВ
-- ==========================================

-- Получаем ID категорий для использования
DO $$
DECLARE
    doc_cat_id UUID;
    img_cat_id UUID;
    pdf_cat_id UUID;
    table_cat_id UUID;
    arch_cat_id UUID;
    code_cat_id UUID;
BEGIN
    SELECT id INTO doc_cat_id FROM file_categories WHERE name = 'Документы';
    SELECT id INTO img_cat_id FROM file_categories WHERE name = 'Изображения';
    SELECT id INTO pdf_cat_id FROM file_categories WHERE name = 'PDF документы';
    SELECT id INTO table_cat_id FROM file_categories WHERE name = 'Таблицы';
    SELECT id INTO arch_cat_id FROM file_categories WHERE name = 'Архивы';
    SELECT id INTO code_cat_id FROM file_categories WHERE name = 'Код';

    -- Вставляем примеры файлов
    INSERT INTO files (
        original_filename, display_name, description, file_extension, 
        mime_type, file_size, file_hash, storage_type, storage_path, 
        category_id, is_public, access_level, uploaded_by, project_id, 
        metadata
    ) VALUES
    
    -- Документы
    (
        'tender_specification_v2.docx', 
        'Техническое задание тендера v2.0',
        'Подробное техническое задание для тендерных процедур с требованиями к подрядчикам',
        '.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        2547832,
        'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        'local',
        '/storage/documents/tender_specification_v2.docx',
        doc_cat_id,
        FALSE,
        'internal',
        uuid_generate_v4(), -- Случайный UUID для пользователя
        uuid_generate_v4(), -- Случайный UUID для проекта
        '{"author": "Иванов И.И.", "pages": 45, "created_with": "Microsoft Word 2021"}'
    ),
    
    -- Изображения
    (
        'company_logo_2024.png',
        'Логотип компании 2024',
        'Официальный логотип компании в высоком разрешении',
        '.png',
        'image/png',
        1024768,
        'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567',
        'supabase',
        'logos/company_logo_2024.png',
        img_cat_id,
        TRUE,
        'public',
        uuid_generate_v4(),
        NULL,
        '{"width": 1920, "height": 1080, "dpi": 300, "color_space": "RGB"}'
    ),
    
    -- PDF документы
    (
        'project_alpha_report_q4_2024.pdf',
        'Отчет по проекту Альфа Q4 2024',
        'Квартальный отчет о ходе выполнения проекта Альфа за 4 квартал 2024 года',
        '.pdf',
        'application/pdf',
        5247123,
        'c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678',
        'local',
        '/storage/reports/project_alpha_report_q4_2024.pdf',
        pdf_cat_id,
        FALSE,
        'restricted',
        uuid_generate_v4(),
        uuid_generate_v4(),
        '{"pages": 78, "created_with": "Adobe Acrobat", "has_signatures": true}'
    ),
    
    -- Таблицы
    (
        'budget_calculation_2025.xlsx',
        'Расчет бюджета 2025',
        'Детальный расчет бюджета компании на 2025 год с разбивкой по кварталам',
        '.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        3456789,
        'd4e5f6789012345678901234567890abcdef1234567890abcdef123456789',
        'local',
        '/storage/tables/budget_calculation_2025.xlsx',
        table_cat_id,
        FALSE,
        'private',
        uuid_generate_v4(),
        NULL,
        '{"sheets": 12, "formulas": 245, "charts": 8, "created_with": "Excel 2021"}'
    ),
    
    -- Архивы
    (
        'project_alpha_documents_archive.zip',
        'Архив документов проекта Альфа',
        'Полный архив всех документов, связанных с проектом Альфа',
        '.zip',
        'application/zip',
        15678432,
        'e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
        'local',
        '/storage/archives/project_alpha_documents_archive.zip',
        arch_cat_id,
        FALSE,
        'internal',
        uuid_generate_v4(),
        uuid_generate_v4(),
        '{"files_count": 127, "compression_ratio": 0.67, "created_with": "7-Zip"}'
    ),
    
    -- Код
    (
        'database_migration_v1.2.sql',
        'Миграция БД v1.2',
        'SQL скрипт для обновления структуры базы данных до версии 1.2',
        '.sql',
        'application/sql',
        87432,
        'f6789012345678901234567890abcdef1234567890abcdef12345678901',
        'local',
        '/storage/migrations/database_migration_v1.2.sql',
        code_cat_id,
        FALSE,
        'internal',
        uuid_generate_v4(),
        uuid_generate_v4(),
        '{"lines": 234, "tables_affected": 5, "indexes_created": 12}'
    );

END $$;

-- ==========================================
-- 4. ПРИВЯЗКА ТЕГОВ К ФАЙЛАМ
-- ==========================================

-- Связываем файлы с тегами
INSERT INTO file_tags_mapping (file_id, tag_id)
SELECT 
    f.id as file_id,
    ft.id as tag_id
FROM files f, file_tags ft
WHERE 
    -- Техническое задание тендера - важно, проект-альфа, техдокументация
    (f.display_name = 'Техническое задание тендера v2.0' AND ft.name IN ('важно', 'проект-альфа', 'техдокументация'))
    OR
    -- Логотип компании - готово, общедоступно
    (f.display_name = 'Логотип компании 2024' AND ft.name IN ('готово', 'общедоступно'))
    OR
    -- Отчет по проекту - важно, проект-альфа, отчет, конфиденциально
    (f.display_name = 'Отчет по проекту Альфа Q4 2024' AND ft.name IN ('важно', 'проект-альфа', 'отчет', 'конфиденциально'))
    OR
    -- Расчет бюджета - важно, финансы, конфиденциально
    (f.display_name = 'Расчет бюджета 2025' AND ft.name IN ('важно', 'финансы', 'конфиденциально'))
    OR
    -- Архив документов - архив, проект-альфа
    (f.display_name = 'Архив документов проекта Альфа' AND ft.name IN ('архив', 'проект-альфа'))
    OR
    -- Миграция БД - техдокументация, готово
    (f.display_name = 'Миграция БД v1.2' AND ft.name IN ('техдокументация', 'готово'));

-- ==========================================
-- 5. ПРИМЕРЫ ЛОГОВ ДОСТУПА
-- ==========================================

-- Создаем логи доступа для демонстрации
INSERT INTO file_access_logs (file_id, user_id, action, ip_address, user_agent, file_size_at_access)
SELECT 
    f.id,
    uuid_generate_v4(), -- Случайный пользователь
    'download',
    '192.168.1.' || (RANDOM() * 254 + 1)::INTEGER,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    f.file_size
FROM files f
WHERE RANDOM() < 0.7; -- 70% файлов имеют логи доступа

-- Добавляем еще несколько действий
INSERT INTO file_access_logs (file_id, user_id, action, ip_address, user_agent, access_duration)
SELECT 
    f.id,
    uuid_generate_v4(),
    'view',
    '10.0.0.' || (RANDOM() * 254 + 1)::INTEGER,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    (RANDOM() * 300 + 30)::INTEGER -- Время просмотра от 30 до 330 секунд
FROM files f
WHERE RANDOM() < 0.5; -- 50% файлов имеют просмотры

-- ==========================================
-- 6. СОЗДАНИЕ ВЕРСИЙ ФАЙЛОВ (ПРИМЕРЫ)
-- ==========================================

-- Создаем несколько версий для техзадания тендера
INSERT INTO file_versions (file_id, version_number, original_filename, file_size, file_hash, storage_path, change_description, uploaded_by)
SELECT 
    f.id,
    1,
    'tender_specification_v1.docx',
    2123456,
    'old_hash_version_1_abcdef1234567890',
    '/storage/documents/versions/tender_specification_v1.docx',
    'Первоначальная версия технического задания',
    uuid_generate_v4()
FROM files f
WHERE f.display_name = 'Техническое задание тендера v2.0';

-- Еще одна версия
INSERT INTO file_versions (file_id, version_number, original_filename, file_size, file_hash, storage_path, change_description, uploaded_by)
SELECT 
    f.id,
    2,
    'tender_specification_v1.1.docx',
    2345678,
    'old_hash_version_1_1_bcdef1234567890',
    '/storage/documents/versions/tender_specification_v1.1.docx',
    'Добавлены дополнительные требования к безопасности',
    uuid_generate_v4()
FROM files f
WHERE f.display_name = 'Техническое задание тендера v2.0';

-- ==========================================
-- 7. ОБНОВЛЕНИЕ СЧЕТЧИКОВ
-- ==========================================

-- Обновляем счетчики скачиваний на основе логов (триггер должен сработать автоматически)
-- Но для примера можно обновить вручную:
UPDATE files 
SET download_count = (
    SELECT COUNT(*) 
    FROM file_access_logs 
    WHERE file_access_logs.file_id = files.id 
    AND action = 'download'
);

-- ==========================================
-- 8. ПОЛЕЗНЫЕ ЗАПРОСЫ ДЛЯ ПРОВЕРКИ
-- ==========================================

-- Выводим комментарии с полезными запросами
/*

-- Проверяем созданные данные:

-- 1. Все файлы с категориями и тегами
SELECT * FROM v_files_with_details ORDER BY created_at DESC;

-- 2. Статистика по файлам
SELECT * FROM v_file_statistics;

-- 3. Популярные файлы
SELECT * FROM v_popular_files;

-- 4. Файлы по категориям
SELECT 
    fc.name as category,
    COUNT(*) as files_count,
    SUM(f.file_size) as total_size
FROM files f
JOIN file_categories fc ON f.category_id = fc.id
WHERE f.is_active = true
GROUP BY fc.name, fc.id
ORDER BY files_count DESC;

-- 5. Наиболее используемые теги
SELECT 
    ft.name,
    ft.usage_count,
    ft.color
FROM file_tags ft
ORDER BY ft.usage_count DESC;

-- 6. История доступа к файлам
SELECT 
    f.display_name,
    fal.action,
    fal.ip_address,
    fal.created_at
FROM file_access_logs fal
JOIN files f ON fal.file_id = f.id
ORDER BY fal.created_at DESC
LIMIT 20;

-- 7. Файлы с версиями
SELECT 
    f.display_name,
    f.version as current_version,
    COUNT(fv.id) as total_versions
FROM files f
LEFT JOIN file_versions fv ON f.id = fv.file_id
GROUP BY f.id, f.display_name, f.version
HAVING COUNT(fv.id) > 0
ORDER BY total_versions DESC;

*/