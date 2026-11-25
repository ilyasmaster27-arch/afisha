-- Ручные проверки после выполнения schema.sql.
-- Основные негативные сценарии удобнее запускать из приложения под двумя аккаунтами.

-- 1. В Table Editor убедитесь, что RLS включён у обеих таблиц.
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('events', 'event_members');

-- 2. Проверьте минимальные GRANT. У anon для events должен быть только SELECT;
--    у event_members не должно быть прав anon.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('events', 'event_members')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 3. Ожидаемые проверки через клиент:
--    гость читает events, но не создаёт строки;
--    пользователь B не обновляет и не удаляет event пользователя A;
--    пользователь B не читает event_members пользователя A;
--    повторный INSERT (event_id, user_id) отклоняется первичным ключом;
--    удаление event удаляет его event_members через ON DELETE CASCADE.
