const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const longDateFormat = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTime(value, long = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Дата не указана'
    : (long ? longDateFormat : dateTimeFormat).format(date).replace(',', ' ·');
}

export function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function minLocalDateTime() {
  return toLocalDateTimeInput(new Date(Date.now() + 5 * 60_000));
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function getInitials(email = '') {
  return email.slice(0, 2).toUpperCase() || 'CP';
}
