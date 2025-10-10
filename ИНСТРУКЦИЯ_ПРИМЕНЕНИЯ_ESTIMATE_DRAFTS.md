# Инструкция по применению таблицы estimate_drafts

## Описание

Таблица `estimate_drafts` предназначена для хранения черновиков смет в системе STAR. Она позволяет сохранять промежуточные версии смет перед их финальным утверждением.

## Способы применения схемы

### Способ 1: Через Supabase Dashboard (Рекомендуемый)

1. **Откройте Supabase Dashboard**
   - Перейдите на https://supabase.com/dashboard
   - Войдите в свой аккаунт
   - Выберите проект STAR

2. **Перейдите в SQL Editor**
   - В левом меню выберите "SQL Editor"
   - Нажмите кнопку "New query" (Новый запрос)

3. **Скопируйте содержимое файла**
   - Откройте файл `supabase\estimate_drafts.sql`
   - Скопируйте всё содержимое файла

4. **Выполните SQL запрос**
   - Вставьте скопированный SQL код в редактор
   - Нажмите кнопку "Run" (Выполнить) или используйте Ctrl+Enter
   - Дождитесь сообщения об успешном выполнении

5. **Проверьте создание таблицы**
   - Перейдите в раздел "Table Editor"
   - Убедитесь, что таблица `estimate_drafts` появилась в списке

### Способ 2: Через Supabase CLI

1. **Установите Supabase CLI** (если еще не установлен)

   ```bash
   npm install -g supabase
   ```

2. **Подключитесь к проекту**

   ```bash
   supabase login
   supabase link --project-ref ваш-project-ref
   ```

3. **Выполните миграцию**
   ```bash
   supabase db push --file supabase/estimate_drafts.sql
   ```

### Способ 3: Через PostgreSQL клиент (pgAdmin, DBeaver и др.)

1. **Получите строку подключения**
   - В Supabase Dashboard перейдите в Settings → Database
   - Скопируйте "Connection string"

2. **Подключитесь к базе данных**
   - Откройте ваш PostgreSQL клиент
   - Создайте новое подключение с параметрами из Supabase

3. **Выполните SQL скрипт**
   - Откройте файл `supabase\estimate_drafts.sql`
   - Выполните весь скрипт

### Способ 4: Через psql (командная строка)

1. **Получите DATABASE_URL**
   - Найдите в файле `.env` переменную DATABASE_URL
   - Или получите из Supabase Dashboard

2. **Выполните команду**
   ```bash
   psql "ваш_DATABASE_URL" -f supabase/estimate_drafts.sql
   ```

## Проверка успешной установки

После применения схемы выполните следующие проверки:

1. **Проверка наличия таблицы**

   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'estimate_drafts';
   ```

2. **Проверка структуры таблицы**

   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'estimate_drafts'
   ORDER BY ordinal_position;
   ```

3. **Проверка индексов**

   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'estimate_drafts';
   ```

4. **Проверка триггера**
   ```sql
   SELECT trigger_name
   FROM information_schema.triggers
   WHERE event_object_table = 'estimate_drafts';
   ```

## Тестирование функционала

1. **Создайте тестовый черновик**

   ```sql
   INSERT INTO estimate_drafts (project_id, name, data, total_amount)
   VALUES (
     (SELECT id FROM projects LIMIT 1),
     'Тестовый черновик',
     '{"positions": [], "metadata": {"test": true}}',
     1000.00
   )
   RETURNING id;
   ```

2. **Проверьте автообновление updated_at**

   ```sql
   UPDATE estimate_drafts
   SET name = 'Обновленный черновик'
   WHERE name = 'Тестовый черновик';

   SELECT name, created_at, updated_at
   FROM estimate_drafts
   WHERE name = 'Обновленный черновик';
   ```

3. **Удалите тестовые данные**
   ```sql
   DELETE FROM estimate_drafts
   WHERE name LIKE '%Тестовый%' OR name LIKE '%Обновленный%';
   ```

## Возможные проблемы и решения

### Ошибка: таблица уже существует

```sql
-- Удалите существующую таблицу (ВНИМАНИЕ: удалит все данные!)
DROP TABLE IF EXISTS estimate_drafts CASCADE;
-- Затем выполните скрипт создания заново
```

### Ошибка: функция gen_random_uuid() не найдена

```sql
-- Включите расширение uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Или используйте pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Ошибка: таблица projects не найдена

```sql
-- Убедитесь, что основная схема БД применена
-- Выполните файл supabase/prod.sql перед estimate_drafts.sql
```

## Откат изменений

Если нужно удалить таблицу и все связанные объекты:

```sql
-- Удаление триггера
DROP TRIGGER IF EXISTS trigger_update_estimate_drafts_updated_at ON estimate_drafts;

-- Удаление функции
DROP FUNCTION IF EXISTS update_estimate_drafts_updated_at();

-- Удаление таблицы
DROP TABLE IF EXISTS estimate_drafts CASCADE;
```

## Контакты для поддержки

При возникновении проблем обратитесь:

- К администратору базы данных
- В техническую поддержку Supabase
- К разработчикам проекта STAR

## Дополнительные материалы

- [Документация Supabase](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Файл схемы: `supabase/estimate_drafts.sql`
- Основная схема БД: `supabase/prod.sql`
