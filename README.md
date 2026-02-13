# TaskFlow — Project & Task Manager

Веб-приложение для управления проектами и задачами с Kanban-доской, аналитикой и ролевой системой.

## Функциональность

### Аутентификация
- Регистрация (email, пароль, имя)
- Вход / Выход
- Защита роутов (ProtectedRoute)

### Проекты
- Создание проекта (название, описание)
- Приглашение участников по email
- Список проектов с количеством участников
- Удаление проектов

### Задачи
- Создание: название, описание, исполнитель, дедлайн, приоритет
- Статусы: To Do → In Progress → Review → Done
- Приоритеты: Low / Medium / High / Urgent
- Редактирование и удаление
- Комментарии к задачам

### Kanban-доска
- 4 колонки по статусам
- Drag-and-drop между колонками
- Визуальная индикация приоритета и просрочки
- Ролевые ограничения (worker не может перемещать в Done)

### Аналитика
- Карточки: всего задач, выполнено, в работе, просрочено
- График распределения по статусам
- Статистика по участникам (для владельцев)
- Вкладки: All Tasks / My Tasks / By Member

### Роли
- **Owner** — полный доступ, управление участниками
- **Member** — создание и редактирование задач
- **Worker** — изменение статусов и комментирование

## Технологии

- **Frontend:** React 18, TypeScript, Vite
- **UI:** shadcn/ui, Tailwind CSS, Framer Motion
- **State:** TanStack React Query
- **Drag & Drop:** @hello-pangea/dnd
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, RLS)
- **Routing:** React Router v6

## Установка и запуск

### 1. Клонирование

```bash
git clone https://github.com/YOUR_USERNAME/project-compass.git
cd project-compass
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните данные вашего Supabase-проекта:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
```

### 4. Настройка базы данных

Выполните SQL-миграции из папки `supabase/migrations/` в SQL Editor вашего Supabase-проекта (по порядку).

### 5. Запуск

```bash
npm run dev
```

Приложение будет доступно на `http://localhost:8080`

### 6. Сборка для продакшена

```bash
npm run build
```

## Деплой

Проект можно задеплоить на:
- **Vercel** — `npm run build`, output в `dist/`
- **Netlify** — `npm run build`, publish directory: `dist/`

Edge Function (`find-user-by-email`) деплоится через Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_ID
npx supabase functions deploy find-user-by-email
```

## Безопасность

- Row Level Security (RLS) на всех таблицах
- Политики доступа по ролям
- Rate limiting на Edge Functions
- CORS ограничен до разрешённых origins
- Валидация и санитизация ввода
- `.env` исключён из version control

## Структура проекта

```
src/
├── components/       # UI-компоненты
├── hooks/            # React-хуки (useAuth, useTasks, useProjects, useComments)
├── integrations/     # Supabase клиент и типы
├── pages/            # Страницы (Auth, Index, ProjectBoard, Analytics)
├── lib/              # Утилиты
└── test/             # Тесты
supabase/
├── functions/        # Edge Functions
└── migrations/       # SQL-миграции
```
