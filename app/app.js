import { fetchIncidents, ack } from './api.js';

const REFRESH_MS = 2000;

const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const list = document.querySelector('[data-testid="incident-list"]');
const panel = document.querySelector('[data-testid="incident-panel"]');

const incidents = new Map();
const acked = new Set();
let selectedId = null;

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

function localTime(incident) {
  return el('time', { datetime: incident.openedAt, title: incident.openedAt }, timeFormat.format(new Date(incident.openedAt)));
}

function rowOf(id) {
  return list.querySelector(`[data-testid="incident-row"][data-id="${CSS.escape(id)}"]`);
}

function markAcked(row) {
  if (!row.querySelector('[data-testid="acked"]')) row.append(el('span', { 'data-testid': 'acked', class: 'acked' }, 'acked'));
}

function renderPanel() {
  const incident = incidents.get(selectedId);
  if (!incident) {
    panel.hidden = true;
    return;
  }
  const heading = el('h2', {}, incident.id);
  const details = el('dl', {});
  for (const [label, value] of [['severity', incident.severity], ['service', incident.service], ['region', incident.region], ['summary', incident.summary]]) {
    details.append(el('dt', {}, label), el('dd', {}, value));
  }
  const opened = el('dd', {});
  opened.append(localTime(incident));
  details.append(el('dt', {}, 'opened'), opened);
  const action = acked.has(incident.id)
    ? el('p', { class: 'acked' }, `${incident.id} acked`)
    : el('button', { type: 'button', 'data-testid': 'panel-ack', class: 'ack' }, `Ack ${incident.id}`);
  if (action.tagName === 'BUTTON') action.addEventListener('click', () => onAck(action, incident.id));
  panel.replaceChildren(heading, details, action);
  panel.dataset.id = incident.id;
  panel.hidden = false;
}

function select(id) {
  rowOf(selectedId)?.classList.remove('selected');
  selectedId = id;
  rowOf(id)?.classList.add('selected');
  renderPanel();
}

async function onAck(button, id) {
  button.disabled = true;
  try {
    await ack(id);
    acked.add(id);
    markAcked(rowOf(id));
    if (selectedId === id) renderPanel();
  } catch (err) {
    console.error(err);
    button.disabled = false;
  }
}

function buildRow(incident) {
  const row = el('li', { 'data-testid': 'incident-row', 'data-id': incident.id, class: `row ${incident.severity}`, tabindex: '0' });
  row.append(
    el('span', { class: 'id' }, incident.id),
    el('span', { class: 'sev' }, incident.severity),
    el('span', { class: 'what' }, `${incident.service} · ${incident.region} · ${incident.summary}`),
    localTime(incident),
  );
  row.addEventListener('click', () => select(incident.id));
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(incident.id);
    }
  });
  return row;
}

// Rows are only ever added, never re-created or removed, so a row keeps its node (and focus) across refreshes.
function render(page) {
  const fresh = page.filter((incident) => !incidents.has(incident.id));
  for (const incident of fresh) incidents.set(incident.id, incident);
  list.prepend(...fresh.map(buildRow));
  loader.remove();
  empty.hidden = incidents.size > 0;
  list.hidden = incidents.size === 0;
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
