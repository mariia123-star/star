-- Schema creation for STAR corporate portal
-- Creation date: 2025-01-15

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for recreation)
DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS object_estimates CASCADE;
DROP TABLE IF EXISTS tender_estimates CASCADE;
DROP TABLE IF EXISTS material_types CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Таблица пользователей портала
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL, -- ФИО пользователя
    email VARCHAR(255) NOT NULL UNIQUE, -- Электронная почта
    role VARCHAR(20) NOT NULL DEFAULT 'инженер' CHECK (role IN ('администратор', 'инженер')), -- Роль пользователя
    is_active BOOLEAN DEFAULT TRUE, -- Активность записи
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица проектов
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300) NOT NULL, -- Название проекта
    description TEXT, -- Описание проекта
    start_date DATE, -- Дата начала проекта
    end_date DATE, -- Дата окончания проекта
    status VARCHAR(50) NOT NULL DEFAULT 'планируется' CHECK (status IN ('планируется', 'в_работе', 'завершен', 'приостановлен')), -- Статус проекта
    budget DECIMAL(15,2) DEFAULT 0, -- Бюджет проекта
    responsible_person UUID REFERENCES users(id) ON DELETE SET NULL, -- Ответственное лицо (ссылка на пользователя)
    is_active BOOLEAN DEFAULT TRUE, -- Активность записи
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица единиц измерения (справочник)
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- Полное название (метр, килограмм, штука)
    short_name VARCHAR(20) NOT NULL UNIQUE, -- Сокращение (м, кг, шт)
    description TEXT, -- Описание единицы измерения
    is_active BOOLEAN DEFAULT TRUE, -- Активность записи
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица типов материалов (справочник)
CREATE TABLE material_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- Полное название (Основной материал, Вспомогательный материал, Расходный материал)
    short_name VARCHAR(20) NOT NULL UNIQUE, -- Сокращение (основ, вспом, расход)
    description TEXT, -- Описание типа материала
    is_active BOOLEAN DEFAULT TRUE, -- Активность записи
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица ссылок
CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL, -- Название ссылки
    url TEXT NOT NULL, -- URL ссылки
    description TEXT, -- Описание ссылки
    category VARCHAR(100), -- Категория ссылки (документы, справочники, инструменты и т.д.)
    icon VARCHAR(100), -- Название иконки для отображения
    color VARCHAR(20), -- Цвет для отображения
    sort_order INTEGER DEFAULT 0, -- Порядок сортировки
    is_active BOOLEAN DEFAULT TRUE, -- Активность записи
    is_external BOOLEAN DEFAULT FALSE, -- Внешняя ссылка (открывается в новом окне)
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Кто создал ссылку
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Таблица тендерных смет (документы)
CREATE TABLE tender_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE RESTRICT, -- Ссылка на проект
    material_type_id UUID REFERENCES material_types(id) ON DELETE RESTRICT, -- Тип материала
    customer VARCHAR(200), -- Заказчик
    row_name VARCHAR(500) NOT NULL, -- Наименование строки
    work_name VARCHAR(500) NOT NULL, -- Наименование работ
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT, -- Единица измерения
    volume DECIMAL(15,4) NOT NULL DEFAULT 0, -- Объем
    material_consumption_ratio DECIMAL(15,6) DEFAULT 1.0, -- Коэффициент расхода материала
    work_price DECIMAL(15,2) DEFAULT 0, -- Цена работы, руб. за ед.
    material_price_with_vat DECIMAL(15,2) DEFAULT 0, -- Цена материала с НДС без доставки, руб. за ед.
    delivery_price DECIMAL(15,2) DEFAULT 0, -- Доставка материала, руб.
    total_price DECIMAL(15,2) DEFAULT 0, -- Итого стоимость, руб с учетом НДС
    notes TEXT, -- Примечания
    is_active BOOLEAN DEFAULT TRUE, -- Активность записи
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица смет по объектам-факт
CREATE TABLE object_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE RESTRICT, -- Ссылка на проект
    object_name VARCHAR(300) NOT NULL, -- Наименование объекта
    materials VARCHAR(500) NOT NULL, -- Материалы
    works VARCHAR(500) NOT NULL, -- Работы
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0, -- Количество (с 4 знаками после запятой)
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT, -- Ссылка на единицу измерения
    unit_price DECIMAL(15,2) DEFAULT 0, -- Цена за единицу (опционально)
    total_price DECIMAL(15,2) DEFAULT 0, -- Общая стоимость (опционально)
    fact_quantity DECIMAL(15,4) DEFAULT 0, -- Фактическое количество
    fact_price DECIMAL(15,2) DEFAULT 0, -- Фактическая стоимость
    completion_date DATE, -- Дата завершения работ
    notes TEXT, -- Примечания
    is_active BOOLEAN DEFAULT TRUE, -- Активность записи
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for query optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_is_active ON projects(is_active);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_responsible_person ON projects(responsible_person);
CREATE INDEX idx_units_name ON units(name);
CREATE INDEX idx_units_short_name ON units(short_name);
CREATE INDEX idx_units_is_active ON units(is_active);
CREATE INDEX idx_links_category ON links(category);
CREATE INDEX idx_links_is_active ON links(is_active);
CREATE INDEX idx_links_sort_order ON links(sort_order);
CREATE INDEX idx_links_created_by ON links(created_by);
CREATE INDEX idx_tender_estimates_project_id ON tender_estimates(project_id);
CREATE INDEX idx_tender_estimates_unit_id ON tender_estimates(unit_id);
CREATE INDEX idx_tender_estimates_is_active ON tender_estimates(is_active);
CREATE INDEX idx_tender_estimates_created_at ON tender_estimates(created_at DESC);
CREATE INDEX idx_object_estimates_project_id ON object_estimates(project_id);
CREATE INDEX idx_object_estimates_object_name ON object_estimates(object_name);
CREATE INDEX idx_object_estimates_unit_id ON object_estimates(unit_id);
CREATE INDEX idx_object_estimates_is_active ON object_estimates(is_active);
CREATE INDEX idx_object_estimates_created_at ON object_estimates(created_at DESC);

-- Function for automatic updated_at field updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers for automatic updated_at updates
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at 
    BEFORE UPDATE ON units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_links_updated_at 
    BEFORE UPDATE ON links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_types_updated_at 
    BEFORE UPDATE ON material_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tender_estimates_updated_at 
    BEFORE UPDATE ON tender_estimates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_object_estimates_updated_at 
    BEFORE UPDATE ON object_estimates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for automatic total price calculation
CREATE OR REPLACE FUNCTION calculate_total_price()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically calculate total price
    IF NEW.unit_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
        NEW.total_price = NEW.unit_price * NEW.quantity;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER calculate_tender_estimates_total 
    BEFORE INSERT OR UPDATE ON tender_estimates 
    FOR EACH ROW EXECUTE FUNCTION calculate_total_price();

CREATE TRIGGER calculate_object_estimates_total 
    BEFORE INSERT OR UPDATE ON object_estimates 
    FOR EACH ROW EXECUTE FUNCTION calculate_total_price();

-- Вставка базовых единиц измерения
INSERT INTO units (name, short_name, description) VALUES
('Метр', 'м', 'Единица измерения длины'),
('Квадратный метр', 'м²', 'Единица измерения площади'),
('Кубический метр', 'м³', 'Единица измерения объема'),
('Килограмм', 'кг', 'Единица измерения массы'),
('Тонна', 'т', 'Единица измерения массы (1000 кг)'),
('Штука', 'шт', 'Единица измерения количества'),
('Литр', 'л', 'Единица измерения объема жидкости'),
('Час', 'ч', 'Единица измерения времени'),
('Человеко-час', 'чел-ч', 'Единица измерения трудозатрат'),
('Комплект', 'компл', 'Единица измерения наборов'),
('Упаковка', 'упак', 'Единица измерения упакованных товаров'),
('Рулон', 'рул', 'Единица измерения рулонных материалов');

-- Вставка типов материалов
INSERT INTO material_types (name, short_name, description) VALUES
('Нет', 'нет', 'Без указания типа материала'),
('Основной материал', 'основ', 'Основные строительные материалы'),
('Вспомогательный материал', 'вспом', 'Вспомогательные материалы для строительства'),
('Расходный материал', 'расход', 'Расходные материалы и инструменты');

-- Вставка примеров тендерных смет для демонстрации
INSERT INTO tender_estimates (project_id, material_type_id, customer, row_name, work_name, unit_id, volume, material_consumption_ratio, work_price, material_price_with_vat, delivery_price, total_price) VALUES
((SELECT id FROM projects WHERE name = 'Реконструкция офисного здания' LIMIT 1), (SELECT id FROM material_types WHERE short_name = 'основ'), 'Заказчик', 'Кирпич керамический полнотелый', 'Кладка наружных стен', (SELECT id FROM units WHERE short_name = 'шт'), 1000.0000, 1.000000, 15.00, 25.50, 2.50, 28000.00),
((SELECT id FROM projects WHERE name = 'Реконструкция офисного здания' LIMIT 1), (SELECT id FROM material_types WHERE short_name = 'основ'), 'раб', 'Бетон М200', 'Заливка фундаментных блоков', (SELECT id FROM units WHERE short_name = 'м³'), 15.5000, 1.000000, 1200.00, 3500.00, 350.00, 59675.00),
((SELECT id FROM projects WHERE name = 'Строительство производственного цеха' LIMIT 1), (SELECT id FROM material_types WHERE short_name = 'основ'), 'мат', 'Арматура А500С Ø12', 'Армирование железобетонных конструкций', (SELECT id FROM units WHERE short_name = 'кг'), 500.0000, 1.050000, 8.00, 45.00, 4.50, 26000.00),
((SELECT id FROM projects WHERE name = 'Модернизация склада' LIMIT 1), (SELECT id FROM material_types WHERE short_name = 'вспом'), 'Заказчик', 'Гидроизоляция рулонная', 'Устройство горизонтальной гидроизоляции', (SELECT id FROM units WHERE short_name = 'м²'), 50.0000, 1.100000, 25.00, 120.00, 12.00, 7850.00);

-- Вставка примеров смет по объектам-факт
INSERT INTO object_estimates (object_name, materials, works, quantity, unit_id, unit_price, fact_quantity, fact_price, completion_date) VALUES
('Офисное здание А', 'Кирпич облицовочный', 'Облицовка фасада', 200, (SELECT id FROM units WHERE short_name = 'м²'), 850.00, 198, 168300.00, '2025-01-10'),
('Склад Б', 'Бетон М300', 'Заливка полов', 120, (SELECT id FROM units WHERE short_name = 'м³'), 4200.00, 125, 525000.00, '2025-01-08'),
('Цех В', 'Металлоконструкции', 'Монтаж каркаса', 15, (SELECT id FROM units WHERE short_name = 'т'), 75000.00, 14.8, 1110000.00, '2025-01-05');

-- Вставка примеров проектов
INSERT INTO projects (name, description, start_date, end_date, status, budget, responsible_person) VALUES
('Реконструкция офисного здания', 'Полная реконструкция главного офисного здания с модернизацией инфраструктуры', '2025-01-01', '2025-06-30', 'в_работе', 15000000.00, (SELECT id FROM users WHERE full_name = 'Иванов Иван Иванович')),
('Строительство производственного цеха', 'Строительство нового производственного цеха для расширения производства', '2025-02-01', '2025-12-31', 'планируется', 25000000.00, (SELECT id FROM users WHERE full_name = 'Петрова Анна Сергеевна')),
('Модернизация склада', 'Обновление складского комплекса и автоматизация процессов', '2024-10-01', '2025-03-31', 'в_работе', 8000000.00, (SELECT id FROM users WHERE full_name = 'Сидоров Алексей Михайлович')),
('Благоустройство территории', 'Ландшафтный дизайн и благоустройство прилегающей территории', '2025-04-01', '2025-08-31', 'планируется', 3500000.00, NULL);

-- Вставка примеров пользователей
INSERT INTO users (full_name, email, role) VALUES
('Иванов Иван Иванович', 'ivanov@star-portal.ru', 'администратор'),
('Петрова Анна Сергеевна', 'petrova@star-portal.ru', 'инженер'),
('Сидоров Алексей Михайлович', 'sidorov@star-portal.ru', 'инженер');

-- Вставка примеров ссылок
INSERT INTO links (title, url, description, category, icon, color, sort_order, is_external, created_by) VALUES
('Тендерная смета', '/documents/tender-estimate', 'Управление тендерными сметами с материалами и работами', 'Документы', 'FileTextOutlined', '#1677ff', 1, false, (SELECT id FROM users WHERE role = 'администратор' LIMIT 1)),
('Смета по объектам-факт', '/documents/object-estimate', 'Учет фактических данных по объектам строительства', 'Документы', 'FileTextOutlined', '#52c41a', 2, false, (SELECT id FROM users WHERE role = 'администратор' LIMIT 1)),
('Пользователи', '/developer/users', 'Управление пользователями системы', 'Разработчик', 'TeamOutlined', '#722ed1', 3, false, (SELECT id FROM users WHERE role = 'администратор' LIMIT 1)),
('Проекты', '/references/projects', 'Управление проектами и назначение ответственных', 'Разработчик', 'BarChartOutlined', '#cf1322', 4, false, (SELECT id FROM users WHERE role = 'администратор' LIMIT 1)),
('Единицы измерения', '/references/units', 'Справочник единиц измерения для документов', 'Разработчик', 'BookOutlined', '#52c41a', 5, false, (SELECT id FROM users WHERE role = 'администратор' LIMIT 1)),
('Типы материалов', '/references/material-types', 'Справочник типов материалов (основные, вспомогательные, расходные)', 'Разработчик', 'BookOutlined', '#fa8c16', 6, false, (SELECT id FROM users WHERE role = 'администратор' LIMIT 1)),
('GitHub Repository', 'https://github.com/company/star-portal', 'Исходный код проекта STAR Portal', 'Инструменты', 'GithubOutlined', '#000000', 7, true, (SELECT id FROM users WHERE role = 'администратор' LIMIT 1)),
('Confluence Wiki', 'https://company.atlassian.net/wiki', 'Документация проекта и техническая база знаний', 'Инструменты', 'BookOutlined', '#0052cc', 8, true, (SELECT id FROM users WHERE role = 'администратор' LIMIT 1)),
('Jira Tasks', 'https://company.atlassian.net/jira', 'Система управления задачами и багами', 'Инструменты', 'BugOutlined', '#0052cc', 9, true, (SELECT id FROM users WHERE role = 'администратор' LIMIT 1));

-- Комментарии к таблицам
COMMENT ON TABLE users IS 'Пользователи корпоративного портала';
COMMENT ON COLUMN users.full_name IS 'Полное имя пользователя (ФИО)';
COMMENT ON COLUMN users.email IS 'Электронная почта пользователя';
COMMENT ON COLUMN users.role IS 'Роль пользователя в системе (администратор, инженер)';
COMMENT ON COLUMN users.is_active IS 'Признак активности пользователя';

COMMENT ON TABLE units IS 'Справочник единиц измерения';
COMMENT ON COLUMN units.name IS 'Полное наименование единицы измерения';
COMMENT ON COLUMN units.short_name IS 'Краткое обозначение единицы измерения';
COMMENT ON COLUMN units.is_active IS 'Признак активности записи';

COMMENT ON TABLE links IS 'Таблица ссылок для быстрого доступа';
COMMENT ON COLUMN links.title IS 'Название ссылки для отображения';
COMMENT ON COLUMN links.url IS 'URL адрес ссылки (внутренний или внешний)';
COMMENT ON COLUMN links.description IS 'Описание ссылки';
COMMENT ON COLUMN links.category IS 'Категория ссылки (Документы, Разработчик, Инструменты и т.д.)';
COMMENT ON COLUMN links.icon IS 'Название иконки из Ant Design Icons';
COMMENT ON COLUMN links.color IS 'Цвет для отображения иконки (hex код)';
COMMENT ON COLUMN links.sort_order IS 'Порядок сортировки ссылок';
COMMENT ON COLUMN links.is_active IS 'Признак активности ссылки';
COMMENT ON COLUMN links.is_external IS 'Внешняя ссылка (true - открывается в новом окне)';
COMMENT ON COLUMN links.created_by IS 'UUID пользователя, создавшего ссылку';


COMMENT ON TABLE tender_estimates IS 'Тендерные сметы (документы)';
COMMENT ON COLUMN tender_estimates.materials IS 'Наименование материалов';
COMMENT ON COLUMN tender_estimates.works IS 'Описание выполняемых работ';
COMMENT ON COLUMN tender_estimates.quantity IS 'Количество с точностью до 4 знаков после запятой';
COMMENT ON COLUMN tender_estimates.unit_price IS 'Цена за единицу измерения';
COMMENT ON COLUMN tender_estimates.total_price IS 'Общая стоимость (рассчитывается автоматически)';

COMMENT ON TABLE object_estimates IS 'Сметы по объектам-факт';
COMMENT ON COLUMN object_estimates.object_name IS 'Наименование объекта';
COMMENT ON COLUMN object_estimates.materials IS 'Наименование материалов';
COMMENT ON COLUMN object_estimates.works IS 'Описание выполняемых работ';
COMMENT ON COLUMN object_estimates.quantity IS 'Плановое количество';
COMMENT ON COLUMN object_estimates.unit_price IS 'Плановая цена за единицу';
COMMENT ON COLUMN object_estimates.total_price IS 'Плановая общая стоимость (рассчитывается автоматически)';
COMMENT ON COLUMN object_estimates.fact_quantity IS 'Фактическое количество';
COMMENT ON COLUMN object_estimates.fact_price IS 'Фактическая общая стоимость';
COMMENT ON COLUMN object_estimates.completion_date IS 'Дата завершения работ по объекту';

COMMENT ON TABLE projects IS 'Проекты компании';
COMMENT ON COLUMN projects.name IS 'Название проекта';
COMMENT ON COLUMN projects.description IS 'Описание проекта';
COMMENT ON COLUMN projects.start_date IS 'Дата начала проекта';
COMMENT ON COLUMN projects.end_date IS 'Дата окончания проекта';
COMMENT ON COLUMN projects.status IS 'Статус проекта (планируется, в_работе, завершен, приостановлен)';
COMMENT ON COLUMN projects.budget IS 'Бюджет проекта';
COMMENT ON COLUMN projects.responsible_person IS 'Ответственное лицо за проект (UUID пользователя)';

-- Создание представления для удобного просмотра смет с названиями единиц
CREATE VIEW v_tender_estimates AS
SELECT 
    te.id,
    te.project_id,
    p.name as project_name,
    te.materials,
    te.works,
    te.quantity,
    u.name as unit_name,
    u.short_name as unit_short_name,
    te.unit_price,
    te.total_price,
    te.notes,
    te.created_at,
    te.updated_at
FROM tender_estimates te
JOIN units u ON te.unit_id = u.id
LEFT JOIN projects p ON te.project_id = p.id
WHERE te.is_active = TRUE
ORDER BY te.created_at DESC;

COMMENT ON VIEW v_tender_estimates IS 'Представление тендерных смет с расшифровкой единиц измерения';

-- Создание представления для удобного просмотра смет по объектам с названиями единиц
CREATE VIEW v_object_estimates AS
SELECT 
    oe.id,
    oe.project_id,
    p.name as project_name,
    oe.object_name,
    oe.materials,
    oe.works,
    oe.quantity,
    u.name as unit_name,
    u.short_name as unit_short_name,
    oe.unit_price,
    oe.total_price,
    oe.fact_quantity,
    oe.fact_price,
    oe.completion_date,
    oe.notes,
    oe.created_at,
    oe.updated_at
FROM object_estimates oe
JOIN units u ON oe.unit_id = u.id
LEFT JOIN projects p ON oe.project_id = p.id
WHERE oe.is_active = TRUE
ORDER BY oe.created_at DESC;

COMMENT ON VIEW v_object_estimates IS 'Представление смет по объектам-факт с расшифровкой единиц измерения';