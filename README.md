# CAMPUS PULSE

Студенческая афиша: пользователи находят события кампуса, регистрируются, создают собственные мероприятия и записываются на чужие. Проект реализован на Vite + vanilla JavaScript и использует Supabase для PostgreSQL, Auth и Row Level Security.

## Возможности

- публичный каталог с поиском, категориями и сортировкой по дате;
- регистрация и вход по email/password, подтверждение email и видимый статус сессии;
- создание, редактирование и удаление только собственных событий;
- запись на событие, защита от дублей и отмена участия;
- разделы «Мои записи» и «Мои события»;
- loading, empty, error, success и disabled-состояния;
- адаптивный интерфейс Midnight Campus от 375 до 1440 px;
- автоматический деплой на GitHub Pages.

## Что понадобится

1. Node.js 22.12+ (рекомендуется актуальная LTS) и npm.
2. Бесплатный проект [Supabase](https://supabase.com/dashboard).
3. Для подключения приложения — только:
   - **Project URL**;
   - **Publishable key** (`sb_publishable_...`).

Пароль базы, secret key и `service_role` key приложению не нужны. Их нельзя добавлять в `.env`, браузерный код или GitHub.

## 1. Настройка Supabase

1. В Supabase Dashboard создайте новый проект и дождитесь запуска базы.
2. Откройте **SQL Editor → New query**.
3. Скопируйте весь файл `supabase/schema.sql`, нажмите **Run**.
4. В **Table Editor** проверьте таблицы `events` и `event_members`; у обеих должен быть включён RLS.
5. В **Project Settings → API Keys** скопируйте Project URL и **Publishable key**. Secret key не используйте.
6. В **Authentication → URL Configuration** временно задайте:
   - Site URL: `http://localhost:5173`;
   - Redirect URLs: `http://localhost:5173/**` и `http://127.0.0.1:5173/**`.
7. В **Authentication → Providers → Email** оставьте Email/Password включённым. Для публичной версии рекомендуется подтверждение email.

### Если не приходит письмо регистрации

Встроенная почта hosted-проекта Supabase предназначена только для проверки: она отправляет письма лишь на email участников команды организации и ограничена двумя письмами в час. Для локальной учебной проверки можно временно выключить **Confirm email** в **Authentication → Providers → Email**, удалить незавершённого пользователя в **Authentication → Users** и зарегистрироваться снова. Для публичной версии включите подтверждение обратно и настройте собственный SMTP.

Схема сначала отзывает стандартные широкие права, затем выдаёт минимальные `GRANT`. Каталог доступен гостям только на чтение. Создание и изменение доступны авторизованным пользователям, а RLS связывает строки с `auth.uid()`.

## 2. Локальный запуск

```bash
npm install
```

Создайте `.env.local` рядом с `package.json`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Запустите приложение:

```bash
npm run dev
```

Откройте адрес из терминала, обычно `http://localhost:5173`. Для проверки production-сборки:

```bash
npm run build
npm run preview
```

## 3. Проверка прав доступа

Создайте два аккаунта A и B в разных браузерах или обычном/приватном окне:

1. A создаёт событие.
2. B видит событие и записывается на него.
3. B не видит кнопок редактирования и удаления события A.
4. Попытка B изменить/удалить строку A прямым API-запросом возвращает 0 строк или ошибку RLS.
5. B видит только собственные строки `event_members`.
6. A удаляет событие; записи участников удаляются через `ON DELETE CASCADE`.

Полный чек-лист находится в `TEST_SCENARIOS.md`. Запросы для проверки настроек — в `supabase/rls-checks.sql`.

## 4. GitHub Pages

1. Создайте публичный GitHub-репозиторий и отправьте проект в ветку `main`.
2. Откройте **Settings → Secrets and variables → Actions → Variables**.
3. Добавьте две repository variables:
   - `VITE_SUPABASE_URL`;
   - `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Откройте **Settings → Pages** и выберите **Source: GitHub Actions**.
5. Push в `main` запустит `.github/workflows/deploy.yml`.
6. После первого деплоя скопируйте URL вида `https://username.github.io/repository/`.
7. Добавьте этот URL в Supabase **Authentication → URL Configuration** как Site URL и Redirect URL (`https://username.github.io/repository/**`).
8. Повторно проверьте регистрацию, вход, создание события и запись на опубликованном сайте.

`vite.config.js` использует `base: './'`, поэтому ассеты работают на GitHub Pages внутри пути репозитория.

## Командная работа по ТЗ

Для зачёта недостаточно загрузить готовый код одним коммитом. Рекомендуемый план:

1. Создать минимум четыре Issues: интерфейс каталога, Auth, CRUD событий, участия/RLS.
2. Работать через `feature/ui-catalog` и `feature/supabase-data` (или похожие ветки).
3. Сделать минимум два Pull Request с описанием и скриншотами.
4. Оставить содержательный review-комментарий и исправить замечание до merge.
5. Использовать осмысленные коммиты: `feat: add event form`, `fix: prevent duplicate joins`.

## Структура

```text
src/main.js                     состояние, рендеринг, пользовательские сценарии
src/style.css                   дизайн-система и адаптивность
src/lib/supabaseClient.js       безопасная инициализация клиента
src/features/auth.js            регистрация, вход и сессия
src/features/events.js          чтение и CRUD событий
src/features/members.js         запись и отмена участия
supabase/schema.sql             таблицы, ограничения, GRANT и RLS
.github/workflows/deploy.yml    сборка и GitHub Pages
```

## Документация

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase password auth](https://supabase.com/docs/guides/auth/passwords)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Vite guide](https://vite.dev/guide/)
- [GitHub Pages](https://docs.github.com/pages)
#   a f i s h a  
 