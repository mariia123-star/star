# Инструкция по миграции базы данных

## Проблема

Материалы не отображаются в таблице расценок из-за отсутствующей таблицы `rate_materials_mapping` в базе данных.

## Решение

Выполните следующие SQL команды в Supabase SQL Editor:

### 1. Создание таблицы rate_materials_mapping

```sql
-- Создание таблицы для связи расценок и материалов
CREATE TABLE IF NOT EXISTS public.rate_materials_mapping (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    rate_id uuid NOT NULL,
    material_id uuid NOT NULL,
    consumption numeric(15,3) NOT NULL DEFAULT 1,
    unit_price numeric(15,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rate_materials_mapping_pkey PRIMARY KEY (id),
    CONSTRAINT rate_materials_mapping_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES public.rates(id) ON DELETE CASCADE,
    CONSTRAINT rate_materials_mapping_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE,
    CONSTRAINT rate_materials_mapping_unique UNIQUE (rate_id, material_id)
);

-- Добавление комментариев
COMMENT ON TABLE public.rate_materials_mapping IS 'Связь расценок с материалами';
COMMENT ON COLUMN public.rate_materials_mapping.rate_id IS 'ID расценки';
COMMENT ON COLUMN public.rate_materials_mapping.material_id IS 'ID материала';
COMMENT ON COLUMN public.rate_materials_mapping.consumption IS 'Расход материала';
COMMENT ON COLUMN public.rate_materials_mapping.unit_price IS 'Цена за единицу на момент добавления';

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_rate_materials_mapping_rate_id ON public.rate_materials_mapping(rate_id);
CREATE INDEX IF NOT EXISTS idx_rate_materials_mapping_material_id ON public.rate_materials_mapping(material_id);

-- Отключение RLS согласно требованиям проекта
ALTER TABLE public.rate_materials_mapping DISABLE ROW LEVEL SECURITY;
```

### 2. Альтернатива: полная перезагрузка схемы

Если вы хотите обновить всю схему базы данных:

```bash
# Подключитесь к базе данных и выполните:
psql "$DATABASE_URL" -f supabase/prod.sql
```

## Исправленные проблемы

1. **Отсутствующая таблица**: Добавлена таблица `rate_materials_mapping` в `prod.sql`
2. **RLS проблема**: Отключен RLS для таблицы (согласно требованиям проекта)
3. **Оптимизация запросов**: Заменен множественный запрос на одиночный оптимизированный

## Проверка работы

После выполнения миграции:

1. Перейдите на страницу "Сборник расценок"
2. Создайте новую расценку
3. Добавьте материалы на вкладке "Материалы"
4. Сохраните расценку
5. Проверьте, что материалы отображаются в колонке "Состав материалов"

## Важно

- Миграция безопасна и использует `IF NOT EXISTS`
- Все данные сохранятся
- Новая таблица автоматически создаст нужные связи
