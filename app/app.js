import { fetchIncidents, ack } from './api.js';

const REFRESH_MS = 2000;

const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const list = document.querySelector('[data-testid="incident-list"]');

const acked = new Set();

const timeFormat = new Intl.DateTimeFormat(navigator.languages, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

function el(tag, attrs, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function markAcked(row) {
  row.querySelector('[data-testid="ack"]')?.remove();
  if (!row.querySelector('[data-testid="acked"]')) row.append(el('span', { 'data-testid': 'acked', class: 'acked' }, 'acked'));
}

async function onAck(button, row, id) {
  button.disabled = true;
  try {
    await ack(id);
    acked.add(id);
    markAcked(row);
  } catch (err) {
    console.error(err);
    button.disabled = false;
  }
}

function buildRow(incident) {
  const row = el('li', { 'data-testid': 'incident-row', 'data-id': incident.id, class: `row ${incident.severity}` });
  row.append(
    el('span', { class: 'id' }, incident.id),
    el('span', { class: 'sev' }, incident.severity),
    el('span', { class: 'what' }, `${incident.service} · ${incident.region} · ${incident.summary}`),
    el('time', { datetime: incident.openedAt, title: incident.openedAt }, timeFormat.format(new Date(incident.openedAt))),
  );
  if (acked.has(incident.id)) {
    markAcked(row);
  } else {
    const button = el('button', { type: 'button', 'data-testid': 'ack', class: 'ack' }, 'Ack');
    button.addEventListener('click', () => onAck(button, row, incident.id));
    row.append(button);
  }
  return row;
}

function render(incidents) {
  const existing = new Map([...list.children].map((row) => [row.dataset.id, row]));
  list.replaceChildren(...incidents.map((incident) => existing.get(incident.id) ?? buildRow(incident)));
  loader.remove();
  empty.hidden = incidents.length > 0;
  list.hidden = incidents.length === 0;
}

async function refresh() {
  try {
    render((await fetchIncidents()).incidents);
  } catch (err) {
    console.error(err);
  } finally {
    setTimeout(refresh, REFRESH_MS);
  }
}

refresh();
