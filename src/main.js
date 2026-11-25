import './style.css';
import { isSupabaseConfigured } from './lib/supabaseClient.js';
import {
  getCurrentSession,
  observeAuth,
  signIn,
  signOut,
  signUp,
} from './features/auth.js';
import {
  CATEGORIES,
  COVER_STYLES,
  createEvent,
  fetchEvents,
  removeEvent,
  updateEvent,
} from './features/events.js';
import {
  fetchMyMemberships,
  joinEvent,
  leaveEvent,
} from './features/members.js';
import {
  escapeHtml,
  formatDateTime,
  getInitials,
  minLocalDateTime,
  toLocalDateTimeInput,
} from './lib/format.js';

const root = document.querySelector('#app');

const state = {
  session: null,
  events: [],
  memberships: new Set(),
  loading: false,
  error: '',
  query: '',
  category: 'Все',
  view: 'all',
  modal: null,
  authMode: 'signin',
  authDraft: { email: '' },
  eventDraft: null,
  fieldErrors: {},
  formError: '',
  busy: '',
  deleteConfirm: null,
  toast: null,
};

const categoryIcons = {
  Культура: '▶',
  Спорт: '◉',
  Хобби: '♟',
  Волонтёрство: '♡',
  Наука: '⌁',
  Игры: '✦',
};

function currentUser() {
  return state.session?.user ?? null;
}

function selectedEvent() {
  const id = state.modal?.eventId;
  return state.events.find((event) => event.id === id) ?? null;
}

function filteredEvents() {
  const query = state.query.trim().toLocaleLowerCase('ru');
  return state.events.filter((event) => {
    const inView =
      state.view === 'joined'
        ? state.memberships.has(event.id)
        : state.view === 'mine'
          ? event.creator_id === currentUser()?.id
          : true;
    const inCategory = state.category === 'Все' || event.category === state.category;
    const matchesQuery = !query || event.title.toLocaleLowerCase('ru').includes(query);
    return inView && inCategory && matchesQuery;
  });
}

function render() {
  root.innerHTML = `
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    ${renderHeader()}
    <main>
      ${!isSupabaseConfigured ? renderSetupState() : renderHome()}
    </main>
    ${renderFooter()}
    ${isSupabaseConfigured ? renderMobileNav() : ''}
    ${renderModal()}
    ${renderToast()}
  `;
}

function renderHeader() {
  const user = currentUser();
  return `
    <header class="site-header">
      <div class="container header-inner">
        <button class="brand" type="button" data-action="nav" data-view="all" aria-label="На главную">
          <span class="brand-mark">✦</span>
          <span>CAMPUS <b>PULSE</b></span>
        </button>
        ${isSupabaseConfigured ? `
          <nav class="desktop-nav" aria-label="Главная навигация">
            <button class="nav-link ${state.view === 'all' ? 'active' : ''}" data-action="nav" data-view="all">События</button>
            <button class="nav-link ${state.view === 'joined' ? 'active' : ''}" data-action="nav" data-view="joined">Мои записи</button>
            ${user ? `<button class="nav-link ${state.view === 'mine' ? 'active' : ''}" data-action="nav" data-view="mine">Мои события</button>` : ''}
          </nav>
          <div class="header-actions">
            ${user ? `
              <button class="button button-primary button-compact" data-action="create-event">+ Создать</button>
              <button class="profile-button" data-action="signout" title="Выйти из аккаунта" aria-label="Выйти из аккаунта ${escapeHtml(user.email)}">
                <span class="avatar">${escapeHtml(getInitials(user.email))}</span>
                <span class="profile-email">${escapeHtml(user.email)}</span>
              </button>
            ` : `<button class="button button-ghost button-compact" data-action="open-auth">Войти</button>`}
          </div>
        ` : ''}
      </div>
    </header>
  `;
}

function renderHome() {
  const visible = filteredEvents();
  const title = state.view === 'joined' ? 'Мои записи' : state.view === 'mine' ? 'Мои события' : 'События рядом';
  return `
    <section class="hero container">
      <div class="eyebrow"><span></span> Твой кампус в одном ритме</div>
      <div class="hero-grid">
        <div>
          <h1>Не пропусти то,<br /><em>что происходит.</em></h1>
          <p class="hero-copy">Люди, идеи и события рядом с тобой. Находи своё, присоединяйся или создавай новое.</p>
        </div>
        <div class="hero-stat" aria-label="Количество предстоящих событий">
          <strong>${state.events.filter((event) => new Date(event.starts_at) >= new Date()).length}</strong>
          <span>предстоящих<br />событий</span>
        </div>
      </div>
    </section>

    <section class="catalog container" aria-labelledby="catalog-title">
      <div class="catalog-heading">
        <div>
          <p class="section-kicker">Афиша кампуса</p>
          <h2 id="catalog-title">${title}</h2>
        </div>
        ${currentUser() ? `<button class="button button-primary create-mobile" data-action="create-event">+ Новое событие</button>` : ''}
      </div>
      <div class="search-row">
        <label class="search-box">
          <span aria-hidden="true">⌕</span>
          <span class="sr-only">Поиск по названию</span>
          <input id="event-search" type="search" value="${escapeHtml(state.query)}" placeholder="Найти мероприятие..." autocomplete="off" />
          ${state.query ? `<button type="button" data-action="clear-search" aria-label="Очистить поиск">×</button>` : ''}
        </label>
        <button class="button button-ghost filter-reset" data-action="reset-filters" ${state.category === 'Все' && !state.query ? 'disabled' : ''}>Сбросить</button>
      </div>
      <div class="filter-bar" aria-label="Фильтр по категории">
        ${['Все', ...CATEGORIES].map((category) => `
          <button class="filter-chip ${state.category === category ? 'active' : ''}" data-action="category" data-category="${category}">${category}</button>
        `).join('')}
      </div>
      ${state.error ? renderErrorState() : `
        <div class="collection-meta"><span id="result-count">${resultLabel(visible.length)}</span><span>По дате ↑</span></div>
        <div class="event-grid" id="event-grid" aria-live="polite">${renderCollectionContent(visible)}</div>
      `}
    </section>
  `;
}

function renderSetupState() {
  return `
    <section class="setup container">
      <div class="setup-card">
        <span class="setup-icon">⌁</span>
        <p class="section-kicker">Нужна одна настройка</p>
        <h1>Подключите свой<br /><em>Supabase‑проект</em></h1>
        <p>Интерфейс готов. Создайте <code>.env.local</code> по образцу <code>.env.example</code>, добавьте Project URL и publishable key, затем перезапустите Vite.</p>
        <div class="setup-code">
          <span>VITE_SUPABASE_URL=...</span>
          <span>VITE_SUPABASE_PUBLISHABLE_KEY=...</span>
        </div>
        <p class="setup-note">Secret или service_role key никогда не должен попадать в браузер и GitHub.</p>
      </div>
    </section>
  `;
}

function renderCollectionContent(events) {
  if (state.loading) {
    return Array.from({ length: 6 }, () => `
      <div class="event-card skeleton" aria-hidden="true"><div></div><span></span><span></span><i></i></div>
    `).join('');
  }
  if (!events.length) return renderEmptyState();
  return events.map(renderEventCard).join('');
}

function renderEventCard(event) {
  const isJoined = state.memberships.has(event.id);
  const isOwner = event.creator_id === currentUser()?.id;
  return `
    <article class="event-card cover-${escapeHtml(event.cover_style)} ${isJoined ? 'joined' : ''}">
      <button class="card-hit" data-action="open-event" data-id="${event.id}" aria-label="Открыть событие ${escapeHtml(event.title)}"></button>
      <div class="card-topline">
        <span class="category-icon">${categoryIcons[event.category] ?? '✦'}</span>
        <span class="category-label">${escapeHtml(event.category)}</span>
        ${isJoined ? '<span class="joined-badge">Вы идёте</span>' : isOwner ? '<span class="owner-badge">Ваше</span>' : ''}
      </div>
      <div class="card-body">
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.description)}</p>
      </div>
      <div class="card-meta">
        <span><b>↗</b> ${escapeHtml(formatDateTime(event.starts_at))}</span>
        <span><b>⌖</b> ${escapeHtml(event.location)}</span>
      </div>
      <span class="card-arrow" aria-hidden="true">↗</span>
    </article>
  `;
}

function renderEmptyState() {
  const text = state.view === 'joined'
    ? 'Вы пока не записались ни на одно событие.'
    : state.view === 'mine'
      ? 'Вы ещё не создали ни одного события.'
      : 'По вашему запросу ничего не нашлось.';
  return `
    <div class="empty-state">
      <span>✦</span>
      <h3>Здесь пока тихо</h3>
      <p>${text}</p>
      ${(state.query || state.category !== 'Все') ? '<button class="button button-ghost" data-action="reset-filters">Сбросить фильтры</button>' : ''}
    </div>
  `;
}

function renderErrorState() {
  return `
    <div class="error-state" role="alert">
      <span>!</span>
      <div><h3>Не удалось загрузить события</h3><p>${escapeHtml(state.error)}</p></div>
      <button class="button button-ghost" data-action="retry">Повторить</button>
    </div>
  `;
}

function renderMobileNav() {
  return `
    <nav class="mobile-nav" aria-label="Мобильная навигация">
      <button class="${state.view === 'all' ? 'active' : ''}" data-action="nav" data-view="all"><span>⌂</span>События</button>
      <button class="${state.view === 'joined' ? 'active' : ''}" data-action="nav" data-view="joined"><span>♡</span>Мои</button>
      <button data-action="${currentUser() ? 'create-event' : 'open-auth'}"><span>＋</span>${currentUser() ? 'Создать' : 'Войти'}</button>
    </nav>
  `;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container"><span>✦ CAMPUS PULSE</span><p>Собираем кампус вместе.</p><small>Vite · Supabase · GitHub Pages</small></div>
    </footer>
  `;
}

function renderModal() {
  if (!state.modal) return '';
  if (state.modal.type === 'auth') return renderAuthModal();
  if (state.modal.type === 'event-form') return renderEventFormModal();
  if (state.modal.type === 'event-detail') return renderEventDetailModal();
  return '';
}

function modalShell(content, label) {
  return `
    <div class="modal-backdrop" data-action="backdrop-close">
      <section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(label)}">
        <button class="modal-close" data-action="close-modal" aria-label="Закрыть">×</button>
        ${content}
      </section>
    </div>
  `;
}

function renderAuthModal() {
  const signingUp = state.authMode === 'signup';
  return modalShell(`
    <div class="auth-panel">
      <div class="modal-mark">✦</div>
      <p class="section-kicker">CAMPUS PULSE</p>
      <h2>${signingUp ? 'Присоединяйся' : 'С возвращением'}</h2>
      <p class="modal-copy">${signingUp ? 'Создай аккаунт и стань частью событий кампуса.' : 'Войди, чтобы записываться и создавать события.'}</p>
      <div class="auth-tabs">
        <button class="${!signingUp ? 'active' : ''}" data-action="auth-tab" data-mode="signin">Вход</button>
        <button class="${signingUp ? 'active' : ''}" data-action="auth-tab" data-mode="signup">Регистрация</button>
      </div>
      <form id="auth-form" data-mode="${state.authMode}">
        <label class="field"><span>Email</span><input name="email" type="email" value="${escapeHtml(state.authDraft.email)}" placeholder="you@university.kz" autocomplete="email" required /></label>
        <label class="field"><span>Пароль</span><input name="password" type="password" placeholder="Минимум 6 символов" minlength="6" autocomplete="${signingUp ? 'new-password' : 'current-password'}" required /></label>
        ${state.formError ? `<p class="form-error" role="alert">${escapeHtml(state.formError)}</p>` : ''}
        <button class="button button-primary button-wide" type="submit" ${state.busy === 'auth' ? 'disabled' : ''}>${state.busy === 'auth' ? 'Подождите…' : signingUp ? 'Создать аккаунт' : 'Войти'}</button>
      </form>
      ${signingUp ? '<p class="privacy-note">После регистрации проверьте почту и подтвердите адрес.</p>' : ''}
    </div>
  `, signingUp ? 'Регистрация' : 'Вход');
}

function renderEventFormModal() {
  const draft = state.eventDraft ?? emptyEventDraft();
  const editing = Boolean(state.modal.eventId);
  return modalShell(`
    <div class="form-panel">
      <p class="section-kicker">${editing ? 'Редактирование' : 'Новое событие'}</p>
      <h2>${editing ? 'Обнови детали' : 'Расскажи о своём событии'}</h2>
      <p class="modal-copy">Заполни детали — и событие появится в общей афише.</p>
      <form id="event-form" novalidate>
        <div class="form-grid">
          ${renderField('title', 'Название', 'text', draft.title, 'Например, Вечер настольных игр', '5', '80')}
          <label class="field"><span>Категория</span><select name="category">${CATEGORIES.map((category) => `<option ${draft.category === category ? 'selected' : ''}>${category}</option>`).join('')}</select>${fieldError('category')}</label>
          ${renderField('starts_at', 'Дата и время', 'datetime-local', draft.starts_at, '', '', '', `min="${minLocalDateTime()}"`)}
          ${renderField('location', 'Место', 'text', draft.location, 'Коворкинг, 3 этаж', '3', '120')}
          <label class="field field-full"><span>Описание</span><textarea name="description" rows="5" minlength="15" maxlength="600" placeholder="Что будет происходить и почему стоит прийти?">${escapeHtml(draft.description)}</textarea><small>${draft.description?.length ?? 0}/600</small>${fieldError('description')}</label>
          <fieldset class="cover-picker field-full"><legend>Цвет обложки</legend><div>${COVER_STYLES.map((style) => `<label class="cover-choice cover-${style.value}"><input type="radio" name="cover_style" value="${style.value}" ${draft.cover_style === style.value ? 'checked' : ''} /><span></span>${style.label}</label>`).join('')}</div></fieldset>
        </div>
        ${state.formError ? `<p class="form-error" role="alert">${escapeHtml(state.formError)}</p>` : ''}
        <div class="form-actions"><button class="button button-ghost" type="button" data-action="close-modal">Отмена</button><button class="button button-primary" type="submit" ${state.busy === 'event-form' ? 'disabled' : ''}>${state.busy === 'event-form' ? 'Сохраняем…' : editing ? 'Сохранить' : 'Опубликовать событие'}</button></div>
      </form>
    </div>
  `, editing ? 'Редактировать событие' : 'Создать событие');
}

function renderField(name, label, type, value, placeholder, minLength = '', maxLength = '', extra = '') {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${minLength ? `minlength="${minLength}"` : ''} ${maxLength ? `maxlength="${maxLength}"` : ''} ${extra} />${fieldError(name)}</label>`;
}

function fieldError(name) {
  return state.fieldErrors[name] ? `<small class="field-error">${escapeHtml(state.fieldErrors[name])}</small>` : '';
}

function renderEventDetailModal() {
  const event = selectedEvent();
  if (!event) return '';
  const user = currentUser();
  const owner = event.creator_id === user?.id;
  const joined = state.memberships.has(event.id);
  const isPast = new Date(event.starts_at) < new Date();
  return modalShell(`
    <div class="detail-cover cover-${escapeHtml(event.cover_style)}">
      <div class="detail-symbol">${categoryIcons[event.category] ?? '✦'}</div>
      <p>${escapeHtml(event.category)}</p>
      <h2>${escapeHtml(event.title)}</h2>
    </div>
    <div class="detail-body">
      <div class="detail-meta"><span><b>↗</b>${escapeHtml(formatDateTime(event.starts_at, true))}</span><span><b>⌖</b>${escapeHtml(event.location)}</span></div>
      <div class="detail-description"><p class="section-kicker">О событии</p><p>${escapeHtml(event.description)}</p></div>
      ${owner ? `
        <div class="detail-actions">
          <button class="button button-primary" data-action="edit-event" data-id="${event.id}">Редактировать</button>
          <button class="button button-danger" data-action="delete-event" data-id="${event.id}" ${state.busy === 'delete' ? 'disabled' : ''}>${state.deleteConfirm === event.id ? 'Удалить безвозвратно' : 'Удалить'}</button>
        </div>
        ${state.deleteConfirm === event.id ? '<p class="delete-hint">Нажмите ещё раз, чтобы подтвердить удаление события и связанных записей.</p>' : ''}
      ` : user ? `
        <button class="button ${joined ? 'button-joined' : 'button-primary'} button-wide" data-action="${joined ? 'leave-event' : 'join-event'}" data-id="${event.id}" ${state.busy === 'membership' || isPast ? 'disabled' : ''}>
          ${state.busy === 'membership' ? 'Обновляем…' : isPast ? 'Событие завершилось' : joined ? '✓ Вы участвуете · Отменить' : 'Участвовать'}
        </button>
      ` : `<button class="button button-primary button-wide" data-action="open-auth">Войти, чтобы участвовать</button>`}
      ${state.formError ? `<p class="form-error" role="alert">${escapeHtml(state.formError)}</p>` : ''}
    </div>
  `, event.title);
}

function renderToast() {
  if (!state.toast) return '';
  return `<div class="toast toast-${state.toast.type}" role="status"><span>${state.toast.type === 'success' ? '✓' : '!'}</span><p>${escapeHtml(state.toast.message)}</p><button data-action="close-toast" aria-label="Закрыть">×</button></div>`;
}

function resultLabel(count) {
  const suffix = count % 10 === 1 && count % 100 !== 11 ? 'событие' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'события' : 'событий';
  return `${count} ${suffix}`;
}

function refreshCollection() {
  const events = filteredEvents();
  const grid = document.querySelector('#event-grid');
  const count = document.querySelector('#result-count');
  if (grid) grid.innerHTML = renderCollectionContent(events);
  if (count) count.textContent = resultLabel(events.length);
}

function emptyEventDraft() {
  return {
    title: '',
    description: '',
    category: CATEGORIES[0],
    starts_at: '',
    location: '',
    cover_style: COVER_STYLES[0].value,
  };
}

function draftFromEvent(event) {
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    starts_at: toLocalDateTimeInput(event.starts_at),
    location: event.location,
    cover_style: event.cover_style,
  };
}

function draftFromForm(form) {
  const data = new FormData(form);
  return {
    title: String(data.get('title') ?? '').trim(),
    description: String(data.get('description') ?? '').trim(),
    category: String(data.get('category') ?? ''),
    starts_at: String(data.get('starts_at') ?? ''),
    location: String(data.get('location') ?? '').trim(),
    cover_style: String(data.get('cover_style') ?? COVER_STYLES[0].value),
  };
}

function validateEvent(draft) {
  const errors = {};
  if (draft.title.length < 5 || draft.title.length > 80) errors.title = 'Введите от 5 до 80 символов.';
  if (draft.description.length < 15 || draft.description.length > 600) errors.description = 'Введите от 15 до 600 символов.';
  if (draft.location.length < 3 || draft.location.length > 120) errors.location = 'Введите от 3 до 120 символов.';
  if (!CATEGORIES.includes(draft.category)) errors.category = 'Выберите категорию из списка.';
  const date = new Date(draft.starts_at);
  if (!draft.starts_at || Number.isNaN(date.getTime())) errors.starts_at = 'Укажите дату и время.';
  else if (date <= new Date()) errors.starts_at = 'Событие должно начинаться в будущем.';
  return errors;
}

function eventPayload(draft) {
  return {
    title: draft.title,
    description: draft.description,
    category: draft.category,
    starts_at: new Date(draft.starts_at).toISOString(),
    location: draft.location,
    cover_style: draft.cover_style,
  };
}

function friendlyError(error) {
  if (!navigator.onLine) return 'Нет подключения к интернету. Проверьте сеть и повторите попытку.';
  if (error?.code === '23505') return 'Вы уже записаны на это событие.';
  if (error?.code === '42501') return 'Недостаточно прав для этого действия. Проверьте RLS-политики и аккаунт.';
  if (error?.code === 'email_address_not_authorized') {
    return 'Supabase не может отправить письмо на этот адрес. Используйте email участника команды проекта или настройте SMTP.';
  }
  if (error?.code === 'over_email_send_rate_limit') {
    return 'Исчерпан лимит писем Supabase. Подождите час или настройте собственный SMTP.';
  }
  if (error?.code === 'email_not_confirmed') return 'Подтвердите email по ссылке из письма, затем войдите снова.';
  if (error?.code === 'signup_disabled') return 'Регистрация отключена в настройках Supabase Auth.';
  if (error?.code === 'weak_password') return 'Пароль слишком простой. Используйте более длинный и сложный пароль.';
  if (error?.code === 'validation_failed') return 'Проверьте правильность email и пароля.';
  if (error?.message?.includes('Invalid login credentials')) return 'Неверный email или пароль.';
  if (error?.message?.includes('Email not confirmed')) return 'Сначала подтвердите email по ссылке из письма.';
  if (error?.message?.includes('User already registered')) return 'Аккаунт с таким email уже существует.';
  return error?.message || 'Произошла неизвестная ошибка.';
}

function showToast(message, type = 'success') {
  state.toast = { message, type };
  render();
  window.setTimeout(() => {
    if (state.toast?.message === message) {
      state.toast = null;
      render();
    }
  }, 4200);
}

async function loadAll() {
  state.loading = true;
  state.error = '';
  render();
  try {
    const [events, memberships] = await Promise.all([
      fetchEvents(),
      currentUser() ? fetchMyMemberships() : Promise.resolve(new Set()),
    ]);
    state.events = events;
    state.memberships = memberships;
  } catch (error) {
    state.error = friendlyError(error);
  } finally {
    state.loading = false;
    render();
  }
}

async function syncSession(session) {
  state.session = session;
  state.memberships = session ? await fetchMyMemberships().catch(() => new Set()) : new Set();
  if (!session && (state.view === 'joined' || state.view === 'mine')) state.view = 'all';
  render();
}

root.addEventListener('input', (event) => {
  if (event.target.matches('#event-search')) {
    state.query = event.target.value;
    refreshCollection();
  }
  if (event.target.matches('#event-form textarea[name="description"]')) {
    const counter = event.target.parentElement.querySelector('small:not(.field-error)');
    if (counter) counter.textContent = `${event.target.value.length}/600`;
  }
});

root.addEventListener('click', async (event) => {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;

  if (action === 'backdrop-close' && event.target !== trigger) return;
  if (action === 'close-modal' || action === 'backdrop-close') {
    state.modal = null;
    state.formError = '';
    state.fieldErrors = {};
    state.deleteConfirm = null;
    render();
    return;
  }
  if (action === 'open-auth') {
    state.modal = { type: 'auth' };
    state.formError = '';
    render();
    return;
  }
  if (action === 'auth-tab') {
    state.authMode = trigger.dataset.mode;
    state.formError = '';
    render();
    return;
  }
  if (action === 'nav') {
    const view = trigger.dataset.view;
    if ((view === 'joined' || view === 'mine') && !currentUser()) {
      state.modal = { type: 'auth' };
    } else {
      state.view = view;
      state.category = 'Все';
      state.query = '';
      state.modal = null;
    }
    render();
    return;
  }
  if (action === 'category') {
    state.category = trigger.dataset.category;
    render();
    return;
  }
  if (action === 'clear-search') {
    state.query = '';
    render();
    return;
  }
  if (action === 'reset-filters') {
    state.query = '';
    state.category = 'Все';
    render();
    return;
  }
  if (action === 'retry') {
    await loadAll();
    return;
  }
  if (action === 'open-event') {
    state.modal = { type: 'event-detail', eventId: trigger.dataset.id };
    state.formError = '';
    render();
    return;
  }
  if (action === 'create-event') {
    if (!currentUser()) {
      state.modal = { type: 'auth' };
    } else {
      state.eventDraft = emptyEventDraft();
      state.modal = { type: 'event-form' };
      state.fieldErrors = {};
      state.formError = '';
    }
    render();
    return;
  }
  if (action === 'edit-event') {
    const eventItem = state.events.find((item) => item.id === trigger.dataset.id);
    if (!eventItem || eventItem.creator_id !== currentUser()?.id) return;
    state.eventDraft = draftFromEvent(eventItem);
    state.modal = { type: 'event-form', eventId: eventItem.id };
    state.fieldErrors = {};
    state.formError = '';
    render();
    return;
  }
  if (action === 'delete-event') {
    const id = trigger.dataset.id;
    if (state.deleteConfirm !== id) {
      state.deleteConfirm = id;
      render();
      return;
    }
    state.busy = 'delete';
    render();
    try {
      await removeEvent(id);
      state.modal = null;
      state.deleteConfirm = null;
      await loadAll();
      showToast('Событие удалено.');
    } catch (error) {
      state.busy = '';
      state.formError = friendlyError(error);
      render();
    }
    return;
  }
  if (action === 'join-event' || action === 'leave-event') {
    const id = trigger.dataset.id;
    state.busy = 'membership';
    state.formError = '';
    render();
    try {
      if (action === 'join-event') await joinEvent(id, currentUser().id);
      else await leaveEvent(id, currentUser().id);
      state.memberships = await fetchMyMemberships();
      state.busy = '';
      render();
      showToast(action === 'join-event' ? 'Вы записались на событие.' : 'Участие отменено.');
    } catch (error) {
      state.busy = '';
      state.formError = friendlyError(error);
      render();
    }
    return;
  }
  if (action === 'signout') {
    try {
      await signOut();
      showToast('Вы вышли из аккаунта.');
    } catch (error) {
      showToast(friendlyError(error), 'error');
    }
    return;
  }
  if (action === 'close-toast') {
    state.toast = null;
    render();
  }
});

root.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (event.target.matches('#auth-form')) {
    const form = event.target;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    state.authDraft.email = email;
    state.busy = 'auth';
    state.formError = '';
    render();
    try {
      const result = state.authMode === 'signup'
        ? await signUp(email, password)
        : await signIn(email, password);
      state.busy = '';
      state.modal = null;
      if (state.authMode === 'signup' && !result.session) {
        showToast('Проверьте почту и подтвердите регистрацию.');
      } else {
        await syncSession(result.session);
        showToast('Вы вошли в Campus Pulse.');
      }
    } catch (error) {
      state.busy = '';
      state.formError = friendlyError(error);
      state.modal = { type: 'auth' };
      render();
    }
    return;
  }

  if (event.target.matches('#event-form')) {
    const draft = draftFromForm(event.target);
    state.eventDraft = draft;
    state.fieldErrors = validateEvent(draft);
    state.formError = '';
    if (Object.keys(state.fieldErrors).length) {
      render();
      return;
    }
    state.busy = 'event-form';
    render();
    try {
      const editingId = state.modal.eventId;
      const saved = editingId
        ? await updateEvent(editingId, eventPayload(draft))
        : await createEvent(eventPayload(draft), currentUser().id);
      state.busy = '';
      state.eventDraft = null;
      await loadAll();
      state.modal = { type: 'event-detail', eventId: saved.id };
      showToast(editingId ? 'Изменения сохранены.' : 'Событие опубликовано.');
    } catch (error) {
      state.busy = '';
      state.formError = friendlyError(error);
      render();
    }
  }
});

async function init() {
  render();
  if (!isSupabaseConfigured) return;
  try {
    state.session = await getCurrentSession();
    observeAuth((session) => syncSession(session));
    await loadAll();
  } catch (error) {
    state.error = friendlyError(error);
    state.loading = false;
    render();
  }
}

init();
