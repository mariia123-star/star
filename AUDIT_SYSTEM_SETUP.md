# Настройка системы аудита портала STAR

## Обзор

Система аудита портала STAR автоматически записывает все действия пользователей, включая создание, обновление, удаление записей, навигацию по страницам, поиск и фильтрацию.

## Установка

### 1. Создание таблиц и триггеров в БД

Выполните SQL-скрипт для создания таблицы логов и автоматических триггеров:

```bash
# Подключитесь к базе данных
psql "$DATABASE_URL" -f create_audit_log.sql
```

Или выполните вручную:

```sql
-- Скопируйте и выполните содержимое файла create_audit_log.sql
-- в вашем PostgreSQL клиенте (pgAdmin, DBeaver, или psql)
```

### 2. Проверка создания таблиц

```sql
-- Проверим что таблица создана
SELECT COUNT(*) FROM portal_audit_log;

-- Проверим что триггеры установлены
SELECT
    schemaname,
    tablename,
    triggername
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE triggername LIKE 'audit_trigger%';
```

## Архитектура системы

### Уровни логирования

1. **Автоматическое логирование БД** (триггеры)
   - CREATE, UPDATE, DELETE операции в основных таблицах
   - Записывает старые и новые значения в JSON формате

2. **Ручное логирование приложения** (React хуки)
   - Действия пользователя: клики, навигация, поиск
   - Бизнес-логика: экспорт, импорт, дублирование

### Типы действий

- `create` - Создание новых записей
- `update` - Обновление существующих записей
- `delete` - Удаление записей
- `view` - Просмотр данных, поиск, фильтрация
- `export` - Экспорт данных
- `import` - Импорт данных
- `navigate` - Навигация между страницами
- `login` - Вход в систему (будущая функциональность)
- `logout` - Выход из системы (будущая функциональность)

## Использование API

### В React компонентах

```typescript
import { usePortalLogger } from '@/shared/hooks/usePortalLogger'

function MyComponent() {
  const logger = usePortalLogger()

  const handleEdit = (itemId: string, newData: any) => {
    // Ваша логика обновления
    updateItem(itemId, newData)

    // Логирование действия
    logger.logUpdate('items', itemId, oldData, newData, 'Обновлен элемент')
  }

  const handleButtonClick = () => {
    logger.logButtonClick('Экспорт данных', 'Главная страница')
  }

  return <button onClick={handleButtonClick}>Экспорт</button>
}
```

### Прямое использование API

```typescript
import { auditLogApi } from '@/shared/api/audit-log-api'

// Создать запись лога
await auditLogApi.create({
  action_type: 'create',
  table_name: 'products',
  record_id: '123',
  new_values: { name: 'Новый продукт' },
  changes_summary: 'Создан новый продукт',
})

// Получить логи с фильтрацией
const logs = await auditLogApi.getAll({
  action_type: 'update',
  date_from: '2024-01-01',
  limit: 100,
})
```

## Просмотр логов

Журнал аудита доступен по адресу `/developer/audit-logs` в разделе "Разработчик".

### Возможности интерфейса

- 📊 **Статистика** - общее количество действий, разбивка по типам
- 🔍 **Фильтрация** - по дате, типу действия, таблице
- 📋 **Детальная информация** - ID записи, сессия, страница, описание
- 🔄 **Автообновление** - данные обновляются каждые 30 секунд
- 📤 **Экспорт** - возможность выгрузки логов (в разработке)

## Производительность

### Оптимизация

1. **Индексы БД** - созданы индексы по основным полям поиска
2. **Лимиты запросов** - ограничение на количество записей
3. **Асинхронность** - логирование не блокирует основные операции
4. **Обработка ошибок** - сбои логирования не влияют на функционал

### Мониторинг

```sql
-- Размер таблицы логов
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE tablename = 'portal_audit_log';

-- Количество записей по дням
SELECT
  DATE(created_at) as date,
  COUNT(*) as records_count
FROM portal_audit_log
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

## Безопасность

- 🔒 **Только чтение** - обычные пользователи не могут изменять логи
- 🛡️ **Защита от SQL-инъекций** - использование параметризованных запросов
- 🔐 **Анонимизация** - IP адреса и User-Agent записываются, но могут быть скрыты
- ⚠️ **Чувствительные данные** - пароли и токены не логируются

## Обслуживание

### Очистка старых логов

```sql
-- Удалить логи старше 3 месяцев
DELETE FROM portal_audit_log
WHERE created_at < NOW() - INTERVAL '3 months';

-- Архивирование (рекомендуется)
CREATE TABLE portal_audit_log_archive AS
SELECT * FROM portal_audit_log
WHERE created_at < NOW() - INTERVAL '1 month';
```

### Резервное копирование

```bash
# Экспорт только таблицы логов
pg_dump "$DATABASE_URL" --table=portal_audit_log --data-only > audit_backup.sql

# Восстановление
psql "$DATABASE_URL" < audit_backup.sql
```

## Устранение неполадок

### Проблема: Логи не записываются автоматически

```sql
-- Проверить что триггеры активны
SELECT * FROM information_schema.triggers
WHERE trigger_name LIKE 'audit_trigger%';

-- Пересоздать триггер для конкретной таблицы
DROP TRIGGER IF EXISTS audit_trigger_rates ON public.rates;
CREATE TRIGGER audit_trigger_rates
    AFTER INSERT OR UPDATE OR DELETE ON public.rates
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
```

### Проблема: Ошибки в браузере при логировании

Проверьте консоль браузера на наличие ошибок сети или JavaScript. Логирование реализовано с обработкой ошибок, поэтому основной функционал должен работать даже при сбоях логирования.

### Проблема: Медленная загрузка страницы логов

```sql
-- Проверить что индексы созданы
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'portal_audit_log';

-- Анализ производительности
EXPLAIN ANALYZE SELECT * FROM portal_audit_log
WHERE action_type = 'update'
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 100;
```

## Дальнейшее развитие

- 🔄 **Real-time уведомления** - WebSocket для live-обновлений
- 📊 **Аналитика** - дашборд с графиками активности
- 🔐 **Интеграция с аутентификацией** - привязка к пользователям
- 📱 **Мобильная версия** - адаптация интерфейса для телефонов
- 🤖 **AI анализ** - автоматическое выявление аномальной активности
