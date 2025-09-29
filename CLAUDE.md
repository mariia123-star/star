# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Requirements

**ВАЖНО**: Все ответы, комментарии, сообщения об ошибках, диалоги и любое другое общение с пользователем должно быть на русском языке. Код и технические термины остаются на английском.

## Common Development Commands

```bash
# Development
npm install           # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run preview      # Preview production build

# Build & Quality
npm run build        # TypeScript check + Vite build (MUST pass before commit)
npm run lint         # ESLint check (MUST pass before commit)
npm run format       # Prettier formatting
npm run format:check # Check formatting without changes
npm run type-check   # Type checking only (standalone)
```

## Pre-commit Checklist

1. Run `npm run lint` and fix all warnings
2. Run `npm run format` to ensure consistent formatting
3. Run `npm run build` and ensure project builds successfully
4. Follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)

## Architecture Overview

### Tech Stack

- **Frontend**: React 19.1, TypeScript 5.8 (strict mode), Vite 7.0
- **UI Library**: Ant Design 5.21 with Vibe design approach
- **State Management**: TanStack Query 5.59+ (server state), Zustand 5.0+ (auth state)
- **Backend**: Supabase 2.47+ (PostgreSQL, Auth, Storage, Edge Functions, Realtime WebSocket)
- **Authentication**: Supabase Auth with OAuth 2.0 (Google, Microsoft) and MFA support
- **Excel Processing**: xlsx 0.18 library for import/export
- **Utilities**: Day.js 1.11 for dates
- **Routing**: React Router DOM 6.27
- **Development**: ESLint, Prettier, dotenv for environment management

### Feature-Sliced Design (FSD) Structure

```
src/
├── app/          # App-level providers, routing
├── pages/        # Route pages (main pages, admin/, documents/, references/)
├── widgets/      # Complex reusable UI blocks (empty - to be populated)
├── features/     # User interactions, business features (auth/)
├── entities/     # Business entities and their APIs (chessboard/, documentation/, rates/, etc.)
├── shared/       # Shared utilities, UI components, types (lib/, types/, ui/)
├── layout/       # Layout components (MainLayout.tsx)
├── lib/          # External library configurations (supabase.ts)
└── components/   # Legacy UI components (ConflictResolutionDialog, DataTable, FileUpload, etc.)
```

### Key Patterns

- **Public API**: Each slice exposes through `index.ts`
- **Imports**: Use path aliases configured in `vite.config.ts` and `tsconfig.app.json`:
  - `@/` → `./src`
  - `@/app/` → `./src/app`
  - `@/pages/` → `./src/pages`
  - `@/widgets/` → `./src/widgets`
  - `@/features/` → `./src/features`
  - `@/entities/` → `./src/entities`
  - `@/shared/` → `./src/shared`
- **State**: TanStack Query for server state, Zustand for auth state only
- **API Files**: Named as `entity-name-api.ts` in `entities/*/api/`
- **Error Handling**: All Supabase queries must include error handling

## Database Integrationclaude

**КРИТИЧЕСКИ ВАЖНО**: Вся информация о структуре базы данных, функциях, триггерах и представлениях должна браться СТРОГО из файла `supabase/prod.sql`. Этот файл является единственным источником истины для схемы БД и содержит актуальное состояние продакшн базы данных.

### MCP Servecclauder Integration

MCP (Model Context Protocol) сервер для Supabase настроен в `.claude/mcp_servers_config.json` и позволяет выполнять SQL запросы напрямую к базе данных для анализа и отладки.

### Supabase Configuration

Environment variables required (see `.env.example`):

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_STORAGE_BUCKET=your-storage-bucket-url

# MCP Server Configuration (для Claude Code)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Development Settings
NODE_ENV=development
VITE_DEV_HOST=192.168.8.85
VITE_DEV_PORT=5173

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/star_db

# Performance Settings
VITE_MAX_FILE_SIZE=262144000
VITE_IMPORT_BATCH_SIZE=5000
VITE_RENDER_BATCH_SIZE=10000

# Observability
VITE_SENTRY_DSN=your-sentry-dsn
VITE_GRAFANA_CLOUD_URL=your-grafana-url

# Feature Flags
VITE_ENABLE_REALTIME=true
VITE_ENABLE_OFFLINE=false
```

Configuration: `src/lib/supabase.ts`

### Database Deployment

Deploy database schemas:

```bash
# Main production schema (актуальное состояние БД)
psql "$DATABASE_URL" -f supabase/prod.sql

# Main development schema
psql "$DATABASE_URL" -f supabase/schema.sql

# Legacy/additional schemas (если нужны для разработки)
psql "$DATABASE_URL" -f supabase/portal_schema.sql
psql "$DATABASE_URL" -f supabase/file_storage_schema.sql
```

### Core Tables

- `tender_estimates` - Тендерные сметы с материалами, работами, количеством и ценами
- `units` - Справочник единиц измерения
- `chessboard` - Main data table for material tracking
- `chessboard_mapping` - Mapping relationships
- `entity_comments_mapping` - Universal mapping table for comments to entities
- `cost_categories`, `detail_cost_categories` - Cost categorization
- `location` - Location/localization data
- `projects`, `blocks` - Project structure
- `documentation` - Document management
- `rates` - Rate management with cost categories

### Database Rules

- All tables MUST include `created_at` and `updated_at` fields
  - **EXCEPTION**: Mapping/junction tables (many-to-many relationships) should NOT have `created_at` and `updated_at` fields
- **Primary keys**: All tables use UUID for primary keys (id field)
- **Mapping table naming**: All mapping/junction tables MUST have `_mapping` suffix
- **КРИТИЧЕСКИ ВАЖНО: НИКОГДА не используй RLS (Row Level Security)** - вся авторизация обрабатывается на уровне приложения
- **ЗАПРЕЩЕНО создавать любые RLS политики** - это может нарушить работу приложения
- Use optimistic locking via `updated_at` timestamp for concurrent edits

### API Pattern

Standard Supabase query pattern with обязательным логированием:

```typescript
const { data, error } = await supabase
  .from('table')
  .select('*, relation:table(*)')
  .order('created_at', { ascending: false })

// ОБЯЗАТЕЛЬНОЕ логирование каждого запроса
console.log('API Request:', {
  table: 'table',
  action: 'select',
  timestamp: new Date().toISOString(),
  success: !error,
  dataCount: data?.length || 0,
})

if (error) {
  console.error('Operation failed:', error)
  throw error
}
```

## Performance Requirements

- Import 5,000 Excel rows ≤ 30 seconds
- Render 10,000 rows ≤ 100ms
- Support 100 concurrent users
- Latency < 300ms for real-time sync
- 99.9% uptime target
- MTTR ≤ 5 minutes

## Critical Guidelines

### MUST DO

- Run `npm run lint` before committing
- Run `npm run format` for consistent code style
- Handle all TypeScript strict mode requirements
- Use absolute imports with path aliases (@/)
- Export public APIs through index.ts files
- Include error handling in all Supabase queries
- Write **TypeScript only** with strict typing
- Use functional React components and hooks
- Data fetching via TanStack Query
- All tables MUST have sorting and filters in column headers
- **ОБЯЗАТЕЛЬНО логировать все действия пользователя в консоль** - каждый клик, отправка формы, API запрос должен быть залогирован

### NEVER DO

- Create files unless absolutely necessary
- Add comments unless explicitly requested
- Use relative imports (../../../)
- Commit .env files or secrets
- Use `any` type in TypeScript
- Create documentation files proactively
- **НИКОГДА не создавай RLS (Row Level Security) политики** - это строго запрещено
- Store secrets or generated artifacts in repository
- **Создавать файлы длиннее 600 строк** - разбивай на более мелкие файлы

## UI/UX Guidelines

- **Mobile-first** design approach
- **WCAG 2.1 AA** accessibility compliance
- Modern, responsive UI with Ant Design 5/Vibe design system
- All tables MUST have sorting and filters in column headers
- Control elements in table rows should be icon-only (no text)
- Display page title in header on all new portal pages
- **Multi-language**: UI is in Russian, maintain Russian labels for user-facing elements

### Filter Components Requirements

All Select components in filters MUST include:

- `allowClear` - enables X button to clear selection
- `showSearch` - enables search by typing
- `filterOption` - custom filter function for Russian text support

```typescript
<Select
  placeholder="Выберите значение"
  allowClear
  showSearch
  filterOption={(input, option) => {
    const text = (option?.children || option?.label)?.toString() || ""
    return text.toLowerCase().includes(input.toLowerCase())
  }}
>
  {options.map(item => (
    <Select.Option key={item.id} value={item.id}>
      {item.name}
    </Select.Option>
  ))}
</Select>
```

## UI Templates

### Шаблон "Документ" (Document Template)

Применяется для страниц категории справочников и документов:

#### 1. Структура страницы

- **Заголовок страницы** отображается в верхней части
- **Два блока фильтров** под шапкой:
  - **Статичный блок** - основные фильтры (проект, корпус и т.д.)
  - **Скрываемый блок** - дополнительные фильтры с кнопкой свернуть/развернуть
- **Таблица данных** - основное содержимое страницы

#### 2. Режимы работы таблицы

- **Режим просмотра** (view) - отображение данных
- **Режим добавления** (add) - добавление новых строк
- **Режим редактирования** (edit) - inline редактирование существующих строк
- **Режим удаления** (delete) - массовое удаление с чекбоксами
- **Массовое редактирование** - одновременное редактирование нескольких строк

#### 3. Закрепление элементов и прокрутка

**КРИТИЧЕСКИ ВАЖНО** для предотвращения двойного скролла:

```tsx
// Главный контейнер страницы - фиксированная высота
<div
  style={{
    height: 'calc(100vh - 96px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden', // ВАЖНО: предотвращает скролл страницы
  }}
>
  // Секция фильтров - не сжимается
  <div style={{ flexShrink: 0, paddingBottom: 16 }}>{/* Фильтры */}</div>
  // Контейнер таблицы - занимает оставшееся пространство
  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
    <Table
      sticky // Закрепление заголовков
      scroll={{
        x: 'max-content',
        y: 'calc(100vh - 300px)',
      }}
    />
  </div>
</div>
```

#### 4. Цветовая схема строк

- white: #ffffff (Заказчик)
- orange: #F8CBAD (раб - рабочие)
- blue: #A4C2F4 (мат - материалы)
- green: #d9f7be
- yellow: #fff1b8
- red: #ffa39e

## Code Standards

- Component names: `PascalCase`
- Variables and functions: `camelCase`
- Use functional React components with hooks
- Data fetching via TanStack Query
- Auth state via Zustand store
- Follow existing patterns in codebase
- **Максимальная длина файла: 600 строк** - если файл превышает этот лимит, разбивай его на более мелкие модули
- **Логирование пользовательских действий**: все кнопки, формы, навигация должны логировать действия в console.log

## TypeScript Configuration

- Composite project with separate `tsconfig.app.json` and `tsconfig.node.json`
- Strict mode enabled with all strict checks
- Path aliases configured in both `tsconfig.app.json` and `vite.config.ts`
- Build info cached in `node_modules/.tmp/`
- Module resolution: bundler mode with ESNext modules
