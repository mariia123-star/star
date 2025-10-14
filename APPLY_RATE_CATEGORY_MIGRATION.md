# Инструкция по применению миграции rate_category

## Что делает миграция

Добавляет столбец `rate_category` в таблицу `materials` для автоматической связи материалов с расценками.

## Как применить миграцию

### Способ 1: Через Supabase Dashboard (рекомендуется)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **SQL Editor** (в боковом меню)
4. Нажмите **New Query**
5. Скопируйте содержимое файла `supabase/add_rate_category_to_materials.sql`
6. Вставьте в редактор SQL
7. Нажмите **Run** или `Ctrl+Enter`

### Способ 2: Через psql (если установлен)

```bash
# Установите переменную DATABASE_URL из .env файла
export DATABASE_URL="postgresql://postgres:password@localhost:5432/star_db"

# Примените миграцию
psql "$DATABASE_URL" -f supabase/add_rate_category_to_materials.sql
```

### Способ 3: Через Supabase CLI

```bash
# Если у вас установлен Supabase CLI
npx supabase db push
```

## Проверка применения миграции

После применения миграции проверьте, что столбец добавлен:

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'materials'
AND column_name = 'rate_category';
```

Ожидаемый результат:
- `column_name`: rate_category
- `data_type`: character varying
- `character_maximum_length`: 200

## Что дальше?

После применения миграции:
1. Перезапустите приложение (`npm run dev`)
2. Откройте страницу **Сборник материалов**
3. При создании/редактировании материала заполните поле **Категория расценки**
4. Материал автоматически свяжется со всеми расценками, у которых `subcategory` совпадает с указанной категорией

## Пример использования

1. Создайте материал с полем `rate_category` = "кирпич"
2. Система автоматически найдет все расценки с `subcategory` = "кирпич"
3. Создаст записи в таблице `rate_materials_mapping` для связи материала с этими расценками
4. Материал станет доступен для использования в этих расценках

## Откат миграции (если нужно)

Если что-то пошло не так, можно откатить изменения:

```sql
-- Удаляем индекс
DROP INDEX IF EXISTS idx_materials_rate_category;

-- Удаляем столбец
ALTER TABLE public.materials DROP COLUMN IF EXISTS rate_category;
```
