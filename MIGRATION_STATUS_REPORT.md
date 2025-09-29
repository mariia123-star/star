# Отчет о статусе миграции tender_estimates

## Текущее состояние

**МИГРАЦИЯ НЕ ПРИМЕНЕНА**: Таблица `tender_estimates` содержит только базовые поля из файла `prod.sql`.

### Поля, которые отсутствуют в базе данных:

1. `record_type` - тип записи (work/material/summary)
2. `material_type` - тип материала (Основной/Вспомогательный)  
3. `coefficient` - коэффициент расхода материала
4. `work_price` - цена работы за единицу
5. `material_price` - цена материала с НДС
6. `delivery_cost` - стоимость доставки
7. `project_id` - связь с проектом

### Текущая структура таблицы tender_estimates:

```sql
- id (uuid, PK)
- materials (varchar(500))
- works (varchar(500))
- quantity (numeric(15,4))
- unit_id (uuid, FK)
- unit_price (numeric(15,2))
- total_price (numeric(15,2))
- notes (text)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

## Инструкции по применению миграции

### Вариант 1: Через Supabase SQL Editor (Рекомендуется)

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Скопируйте и выполните содержимое файла `execute_migration.sql`
4. После выполнения запустите запросы из `verify_migration.sql` для проверки

### Вариант 2: Проверка статуса без выполнения

Выполните запросы из файла `check_migration_status.sql` в SQL Editor для проверки текущего состояния.

## Файлы для миграции:

- `tender_estimates_migration.sql` - полная миграция с триггерами
- `execute_migration.sql` - упрощенная версия для выполнения
- `verify_migration.sql` - проверка результатов
- `check_migration_status.sql` - быстрая проверка статуса

## Важные замечания:

1. Миграция добавит новые поля с значениями по умолчанию
2. Существующие данные будут сохранены
3. Будет создан новый триггер для автоматического расчета цен
4. Добавятся индексы для улучшения производительности
5. RLS (Row Level Security) останется отключенным согласно требованиям проекта