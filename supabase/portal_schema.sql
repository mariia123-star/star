-- Создание схемы для корпоративного портала STAR
-- Дата создания: 2025-01-15

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Удаляем таблицы если они существуют (для пересоздания)
DROP TABLE IF EXISTS tender_estimates CASCADE;
DROP TABLE IF EXISTS units CASCADE;

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

-- Таблица тендерных смет (документы)
CREATE TABLE tender_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    materials VARCHAR(500) NOT NULL, -- Материалы
    works VARCHAR(500) NOT NULL, -- Работы
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0, -- Количество (с 4 знаками после запятой)
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT, -- Ссылка на единицу измерения
    unit_price DECIMAL(15,2) DEFAULT 0, -- Цена за единицу (опционально)
    total_price DECIMAL(15,2) DEFAULT 0, -- Общая стоимость (опционально)
    notes TEXT, -- Примечания
    is_active BOOLEAN DEFAULT TRUE, -- Активность записи
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_units_name ON units(name);
CREATE INDEX idx_units_short_name ON units(short_name);
CREATE INDEX idx_units_is_active ON units(is_active);
CREATE INDEX idx_tender_estimates_unit_id ON tender_estimates(unit_id);
CREATE INDEX idx_tender_estimates_is_active ON tender_estimates(is_active);
CREATE INDEX idx_tender_estimates_created_at ON tender_estimates(created_at DESC);

-- Функция автоматического обновления поля updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_units_updated_at 
    BEFORE UPDATE ON units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tender_estimates_updated_at 
    BEFORE UPDATE ON tender_estimates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Триггер для автоматического расчета общей стоимости
CREATE OR REPLACE FUNCTION calculate_total_price()
RETURNS TRIGGER AS $$
BEGIN
    -- Автоматически рассчитываем общую стоимость
    IF NEW.unit_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
        NEW.total_price = NEW.unit_price * NEW.quantity;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_tender_estimates_total 
    BEFORE INSERT OR UPDATE ON tender_estimates 
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

-- Вставка примеров тендерных смет для демонстрации
INSERT INTO tender_estimates (materials, works, quantity, unit_id, unit_price) VALUES
('Кирпич керамический', 'Кладка стен', 1000, (SELECT id FROM units WHERE short_name = 'шт'), 25.50),
('Бетон М200', 'Заливка фундамента', 15.5, (SELECT id FROM units WHERE short_name = 'м³'), 3500.00),
('Арматура А500С Ø12', 'Армирование', 500, (SELECT id FROM units WHERE short_name = 'кг'), 45.00),
('Гидроизоляция рулонная', 'Устройство гидроизоляции', 50, (SELECT id FROM units WHERE short_name = 'м²'), 120.00);

-- Комментарии к таблицам
COMMENT ON TABLE units IS 'Справочник единиц измерения';
COMMENT ON COLUMN units.name IS 'Полное наименование единицы измерения';
COMMENT ON COLUMN units.short_name IS 'Краткое обозначение единицы измерения';
COMMENT ON COLUMN units.is_active IS 'Признак активности записи';

COMMENT ON TABLE tender_estimates IS 'Тендерные сметы (документы)';
COMMENT ON COLUMN tender_estimates.materials IS 'Наименование материалов';
COMMENT ON COLUMN tender_estimates.works IS 'Описание выполняемых работ';
COMMENT ON COLUMN tender_estimates.quantity IS 'Количество с точностью до 4 знаков после запятой';
COMMENT ON COLUMN tender_estimates.unit_price IS 'Цена за единицу измерения';
COMMENT ON COLUMN tender_estimates.total_price IS 'Общая стоимость (рассчитывается автоматически)';

-- Создание представления для удобного просмотра смет с названиями единиц
CREATE VIEW v_tender_estimates AS
SELECT 
    te.id,
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
WHERE te.is_active = TRUE
ORDER BY te.created_at DESC;

COMMENT ON VIEW v_tender_estimates IS 'Представление тендерных смет с расшифровкой единиц измерения';