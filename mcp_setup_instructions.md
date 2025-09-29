# 🔌 Настройка MCP Server для Supabase в проекте STAR

## 🎯 Что это дает

MCP (Model Context Protocol) сервер для Supabase позволяет Claude Code напрямую работать с вашей базой данных:

- 🗄️ **Выполнять SQL запросы** к таблицам портала STAR
- 📊 **Анализировать данные** в реальном времени
- 🔧 **Создавать и модифицировать** схемы БД
- 📈 **Получать статистику** по единицам измерения и тендерным сметам
- 🔍 **Отлаживать запросы** и оптимизировать производительность

## 📋 Пошаговая настройка

### 1. Получите данные из Supabase Dashboard

1. Откройте ваш проект в [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдите в **Settings** → **API**
3. Скопируйте:
   - **URL**: `https://your-project-id.supabase.co`
   - **Service Role Key** (⚠️ НЕ anon key!)

### 2. Настройте переменные окружения

Создайте файл `.env.local` в корне проекта:

```env
# Supabase для приложения
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# MCP Server для Claude Code
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Активируйте MCP Server

Конфигурация уже создана в `.claude/mcp_servers_config.json`.

Перезапустите Claude Code, чтобы MCP сервер подключился.

## 🧪 Тестирование подключения

После настройки вы сможете использовать команды:

```sql
-- Просмотр таблиц
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Данные из единиц измерения
SELECT * FROM units WHERE is_active = true;

-- Статистика по тендерным сметам
SELECT
    COUNT(*) as total_estimates,
    SUM(total_price) as total_sum
FROM tender_estimates
WHERE is_active = true;

-- Популярные единицы измерения
SELECT
    u.name,
    u.short_name,
    COUNT(te.id) as usage_count
FROM units u
LEFT JOIN tender_estimates te ON u.id = te.unit_id
GROUP BY u.id, u.name, u.short_name
ORDER BY usage_count DESC;
```

## 📊 Полезные запросы для анализа данных STAR

```sql
-- 1. Общая статистика портала
SELECT
    (SELECT COUNT(*) FROM units WHERE is_active = true) as active_units,
    (SELECT COUNT(*) FROM tender_estimates WHERE is_active = true) as total_estimates,
    (SELECT SUM(total_price) FROM tender_estimates WHERE is_active = true) as total_value;

-- 2. Топ материалов по количеству
SELECT
    materials,
    SUM(quantity) as total_quantity,
    COUNT(*) as entries_count
FROM tender_estimates
WHERE is_active = true
GROUP BY materials
ORDER BY total_quantity DESC
LIMIT 10;

-- 3. Анализ по единицам измерения
SELECT
    u.name as unit_name,
    u.short_name,
    COUNT(te.id) as usage_count,
    AVG(te.quantity) as avg_quantity,
    SUM(te.total_price) as total_price
FROM units u
LEFT JOIN tender_estimates te ON u.id = te.unit_id AND te.is_active = true
WHERE u.is_active = true
GROUP BY u.id, u.name, u.short_name
ORDER BY usage_count DESC;

-- 4. Недавно добавленные записи
SELECT
    te.materials,
    te.works,
    te.quantity,
    u.short_name as unit,
    te.total_price,
    te.created_at
FROM tender_estimates te
JOIN units u ON te.unit_id = u.id
WHERE te.is_active = true
ORDER BY te.created_at DESC
LIMIT 20;
```

## ⚠️ Безопасность

- **Service Role Key** имеет полные права доступа к БД
- Храните ключи в `.env.local` (файл в `.gitignore`)
- НЕ коммитьте секретные ключи в Git
- Используйте RLS только через Supabase Dashboard, не в коде

## 🔧 Troubleshooting

### Ошибка подключения

- Проверьте правильность SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY
- Убедитесь, что проект Supabase активен
- Проверьте сетевое подключение

### MCP Server не отвечает

- Перезапустите Claude Code
- Проверьте файл `.claude/mcp_servers_config.json`
- Убедитесь, что переменные окружения загружены

### Ошибки SQL

- Используйте `information_schema` для изучения структуры БД
- Проверьте названия таблиц и полей в схеме
- Помните о UUID полях (используйте uuid_generate_v4())

## 🎉 Готово!

После настройки вы сможете:

- Анализировать данные портала STAR в реальном времени
- Создавать сложные отчеты и аналитику
- Оптимизировать производительность БД
- Тестировать новые функции напрямую в Claude Code
