# Инструкции по выполнению миграции tender_estimates

## Обзор миграции

Эта миграция расширяет таблицу `tender_estimates` для поддержки полной функциональности тендерных смет с разделением на работы и материалы.

### Добавляемые колонки:

- `material_type` - Тип материала (Основной/Вспомогательный)
- `coefficient` - Коэффициент расхода материала
- `work_price` - Цена работы за единицу измерения
- `material_price` - Цена материала с НДС без доставки
- `delivery_cost` - Стоимость доставки материала
- `record_type` - Тип записи (work/material/summary)
- `project_id` - Ссылка на проект

### Дополнительные изменения:

- Создание индексов для производительности
- Добавление ограничений на `record_type`
- Функция автоматического расчета `total_price`
- Триггер для автоматических вычислений

## Способы выполнения миграции

### Способ 1: Supabase Dashboard (Рекомендуется)

1. Откройте ваш проект в [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в раздел "SQL Editor"
3. Создайте новый запрос
4. Скопируйте содержимое файла `execute_migration.sql`
5. Вставьте код в SQL Editor
6. Нажмите "Run" для выполнения миграции

### Способ 2: Локальный psql (если установлен)

```bash
# Подключение к базе данных
psql "postgresql://postgres:[your-password]@db.[your-ref].supabase.co:5432/postgres"

# Выполнение миграции
\i execute_migration.sql
```

### Способ 3: Через REST API (программно)

```bash
curl -X POST 'https://[your-ref].supabase.co/rest/v1/rpc/exec_sql' \
  -H "apikey: [your-anon-key]" \
  -H "Authorization: Bearer [your-jwt]" \
  -H "Content-Type: application/json" \
  -d '{"sql": "содержимое_execute_migration.sql"}'
```

## Проверка результатов

После выполнения миграции:

1. Выполните запросы из файла `verify_migration.sql` в SQL Editor
2. Убедитесь, что все новые колонки созданы
3. Проверьте, что индексы и ограничения установлены
4. Убедитесь, что функция и триггер работают

### Ожидаемые результаты проверки:

#### Новые колонки:

```
material_type    | character varying(50) | YES
coefficient      | numeric(10,4)         | YES | 1
work_price       | numeric(15,2)         | YES | 0
material_price   | numeric(15,2)         | YES | 0
delivery_cost    | numeric(15,2)         | YES | 0
record_type      | character varying(20) | YES | 'work'::character varying
project_id       | uuid                  | YES
```

#### Новые индексы:

```
idx_tender_estimates_record_type
idx_tender_estimates_project_id
idx_tender_estimates_is_active
```

#### Ограничения:

```
check_record_type | CHECK | (record_type IN ('work', 'material', 'summary'))
```

## Откат миграции (в случае проблем)

Если необходимо откатить изменения:

```sql
-- Удаление триггера и функции
DROP TRIGGER IF EXISTS trigger_calculate_tender_estimate_total ON public.tender_estimates;
DROP FUNCTION IF EXISTS calculate_tender_estimate_total();

-- Удаление ограничений
ALTER TABLE public.tender_estimates DROP CONSTRAINT IF EXISTS check_record_type;

-- Удаление индексов
DROP INDEX IF EXISTS idx_tender_estimates_record_type;
DROP INDEX IF EXISTS idx_tender_estimates_project_id;
DROP INDEX IF EXISTS idx_tender_estimates_is_active;

-- Удаление колонок (ОСТОРОЖНО! Данные будут потеряны)
ALTER TABLE public.tender_estimates
DROP COLUMN IF EXISTS material_type,
DROP COLUMN IF EXISTS coefficient,
DROP COLUMN IF EXISTS work_price,
DROP COLUMN IF EXISTS material_price,
DROP COLUMN IF EXISTS delivery_cost,
DROP COLUMN IF EXISTS record_type,
DROP COLUMN IF EXISTS project_id;
```

## Тестирование после миграции

1. Создайте тестовую запись:

```sql
INSERT INTO public.tender_estimates (
    works, materials, unit, quantity, unit_price,
    work_price, material_price, coefficient, record_type
) VALUES (
    'Тестовая работа', '', 'м2', 10, 100,
    100, 0, 1, 'work'
);
```

2. Проверьте автоматический расчет `total_price`
3. Убедитесь, что триггер работает корректно

## Возможные проблемы и решения

### Ошибка: "column already exists"

Это нормально - используется `ADD COLUMN IF NOT EXISTS`

### Ошибка с ограничениями

Проверьте, что в существующих данных нет недопустимых значений для `record_type`

### Проблемы с производительностью

После миграции выполните:

```sql
ANALYZE public.tender_estimates;
```

## Контакты для поддержки

При возникновении проблем:

1. Проверьте логи Supabase Dashboard
2. Выполните запросы проверки из `verify_migration.sql`
3. Сохраните текст ошибок для анализа
