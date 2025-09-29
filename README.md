# STAR Portal

Современный веб-портал на базе Feature-Sliced Design архитектуры с использованием React 19.1, Vite 7.0 и Supabase.

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env

# Запуск dev сервера
npm run dev
```

## Технологический стек

- **Frontend**: React 19.1, TypeScript 5.8, Vite 7.0
- **UI**: Ant Design 5.21
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State Management**: TanStack Query + Zustand
- **Архитектура**: Feature-Sliced Design (FSD)

## Команды разработки

```bash
npm run dev          # Запуск dev сервера
npm run build        # Сборка проекта
npm run preview      # Предварительный просмотр сборки
npm run lint         # Проверка кода ESLint
npm run format       # Форматирование Prettier
npm run type-check   # Проверка типов TypeScript
```

## Структура проекта (FSD)

```
src/
├── app/          # Конфигурация приложения, провайдеры
├── pages/        # Страницы маршрутизации
├── widgets/      # Сложные переиспользуемые блоки
├── features/     # Бизнес-функциональность
├── entities/     # Бизнес-сущности
├── shared/       # Общие утилиты и компоненты
└── lib/          # Конфигурация внешних библиотек
```

## База данных

Схема базы данных находится в `supabase/schema.sql`. Основные таблицы:

- `chessboard` - Основная таблица данных
- `projects`, `blocks` - Структура проектов
- `cost_categories` - Категории затрат
- `documentation` - Управление документами
- `rates` - Управление расценками

## Развертывание схемы БД

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
```

## Требования к производительности

- Импорт 5000 строк из Excel ≤ 30 секунд
- Рендеринг 10000 строк ≤ 100мс
- Поддержка 100 одновременных пользователей
- Latency < 300мс для real-time синхронизации
