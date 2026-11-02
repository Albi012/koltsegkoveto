import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { LocalStore, SupabaseStore, readLocal, clearLocal } from './store.js';

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const CATEGORIES = [
  ['Élelmiszer', '🛒'], ['Étterem', '🍽️'], ['Lakhatás', '🏠'], ['Rezsi', '💡'],
  ['Közlekedés', '🚗'], ['Egészség', '💊'], ['Szórakozás', '🎬'], ['Ruházat', '👕'],
  ['Előfizetések', '📱'], ['Ajándék', '🎁'], ['Iqos', '🚬'], ['Egyéb', '📦'],
];
const ICON = Object.fromEntries(CATEGORIES);

const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 });
const monthFmt = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long' });
const dayFmt = new Intl.DateTimeFormat('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' });
const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD helyi idő szerint

let store = null;
let state = { expenses: [], budget: 0 };
let editingId = null;
let current = today().slice(0, 7); // YYYY-MM

// ---------- Segédfüggvények ----------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Futtat egy adatbázis-műveletet; hiba esetén szól és visszatölti az adatokat. */
async function run(fn) {
  try {
    return await fn();
  } catch (err) {
    alert(`Hiba történt: ${err.message}`);
    try { state = await store.load(); render(); } catch { /* már jeleztük */ }
    throw err;
  }
}

function show(view) {
  $('loading').hidden = view !== 'loading';
  $('authCard').hidden = view !== 'auth';
  $('app').hidden = view !== 'app';
}

// ---------- Megjelenítés ----------

function render() {
  const [y, m] = current.split('-').map(Number);
  $('monthLabel').textContent = monthFmt.format(new Date(y, m - 1, 1));

  const month = state.expenses.filter((e) => e.date.startsWith(current));
  const total = month.reduce((s, e) => s + e.amount, 0);
  $('total').textContent = fmt.format(total);

  if (state.budget > 0) {
    const left = state.budget - total;
    $('budgetInfo').innerHTML = left >= 0
      ? `Keret: ${fmt.format(state.budget)} · <span class="badge">Maradt: ${fmt.format(left)}</span>`
      : `Keret: ${fmt.format(state.budget)} · <span class="over">Túllépve: ${fmt.format(-left)}</span>`;
  } else {
    $('budgetInfo').textContent = '';
  }

  const byCat = {};
  for (const e of month) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = sorted.length ? sorted[0][1] : 1;
  $('bars').innerHTML = sorted.map(([cat, sum]) => `
    <div class="bar">
      <span>${ICON[cat] || '📦'} ${escapeHtml(cat)}</span>
      <div class="track"><div class="fill" style="width:${(sum / max) * 100}%"></div></div>
      <span class="val">${fmt.format(sum)} · ${Math.round((sum / total) * 100)}%</span>
    </div>`).join('');

  const filter = $('filter').value;
  const items = month
    .filter((e) => !filter || e.category === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);

  if (!items.length) {
    $('list').innerHTML = `<li class="empty">Ebben a hónapban még nincs ${filter ? 'ilyen ' : ''}kiadás.</li>`;
    return;
  }
  let html = '';
  let lastDay = '';
  for (const e of items) {
    if (e.date !== lastDay) {
      lastDay = e.date;
      const [yy, mm, dd] = e.date.split('-').map(Number);
      html += `<li class="day">${dayFmt.format(new Date(yy, mm - 1, dd))}</li>`;
    }
    html += `
      <li class="item">
        <span style="font-size:1.4rem">${ICON[e.category] || '📦'}</span>
        <div class="info">
          <div class="note">${escapeHtml(e.note || e.category)}</div>
          <div class="meta">${escapeHtml(e.category)}</div>
        </div>
        <span class="amt">${fmt.format(e.amount)}</span>
        <button data-edit="${escapeHtml(e.id)}" aria-label="Szerkesztés">✏️</button>
        <button class="del" data-del="${escapeHtml(e.id)}" aria-label="Törlés">✕</button>
      </li>`;
  }
  $('list').innerHTML = html;
}

function resetForm() {
  editingId = null;
  $('form').reset();
  $('date').value = today();
  $('formTitle').textContent = 'Új kiadás';
  $('submitBtn').textContent = 'Hozzáadás';
  $('cancelEdit').hidden = true;
}

function updateMigrateCard() {
  const local = readLocal().expenses;
  const visible = store instanceof SupabaseStore && local.length > 0;
  $('migrateCard').hidden = !visible;
  if (visible) $('migrateText').textContent = `${local.length} tétel van ebben a böngészőben tárolva. Feltöltöd az adatbázisba?`;
}

async function startApp(newStore) {
  store = newStore;
  show('loading');
  try {
    state = await store.load();
  } catch (err) {
    $('loading').textContent = `Nem sikerült betölteni az adatokat: ${err.message}`;
    return;
  }
  $('storageNote').textContent = store.label;
  resetForm();
  render();
  updateMigrateCard();
  show('app');
}

// ---------- Kiadások űrlap és lista ----------

for (const [name, icon] of CATEGORIES) $('category').add(new Option(`${icon} ${name}`, name));
$('filter').add(new Option('Mind', ''));
for (const [name, icon] of CATEGORIES) $('filter').add(new Option(`${icon} ${name}`, name));
$('date').value = today();

$('form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const amount = Math.round(parseFloat($('amount').value) * 100) / 100;
  if (!(amount > 0)) return;
  const data = { amount, date: $('date').value, category: $('category').value, note: $('note').value.trim() };

  $('submitBtn').disabled = true;
  try {
    if (editingId) {
      const id = editingId;
      await run(() => store.update(id, data));
      Object.assign(state.expenses.find((e) => e.id === id), data);
    } else {
      state.expenses.push(await run(() => store.add(data)));
    }
    current = data.date.slice(0, 7);
    resetForm();
    render();
    $('amount').focus();
  } catch { /* run() már jelezte */ } finally {
    $('submitBtn').disabled = false;
  }
});

$('cancelEdit').addEventListener('click', resetForm);

$('list').addEventListener('click', async (ev) => {
  const del = ev.target.closest('[data-del]');
  const edit = ev.target.closest('[data-edit]');
  if (del) {
    if (!confirm('Biztosan törlöd ezt a tételt?')) return;
    const id = del.dataset.del;
    del.disabled = true;
    try {
      await run(() => store.remove(id));
      state.expenses = state.expenses.filter((e) => e.id !== id);
      if (editingId === id) resetForm();
      render();
    } catch { /* run() már jelezte */ }
  } else if (edit) {
    const e = state.expenses.find((x) => x.id === edit.dataset.edit);
    editingId = e.id;
    $('amount').value = e.amount;
    $('date').value = e.date;
    $('category').value = e.category;
    $('note').value = e.note;
    $('formTitle').textContent = 'Kiadás szerkesztése';
    $('submitBtn').textContent = 'Mentés';
    $('cancelEdit').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

function shiftMonth(delta) {
  const [y, m] = current.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  render();
}
$('prev').addEventListener('click', () => shiftMonth(-1));
$('next').addEventListener('click', () => shiftMonth(1));
$('filter').addEventListener('change', render);

// ---------- Beállítások, export, mentés ----------

$('setBudget').addEventListener('click', async () => {
  const v = prompt('Havi költségkeret (Ft), 0 = nincs keret:', state.budget || '');
  if (v === null) return;
  const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'));
  const budget = n > 0 ? Math.round(n * 100) / 100 : 0;
  try {
    await run(() => store.setBudget(budget));
    state.budget = budget;
    render();
  } catch { /* run() már jelezte */ }
});

function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('exportCsv').addEventListener('click', () => {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [['Dátum', 'Kategória', 'Összeg', 'Megjegyzés']]
    .concat([...state.expenses].sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => [e.date, e.category, e.amount, e.note]));
  download('kiadasok.csv', `﻿${rows.map((r) => r.map(q).join(';')).join('\n')}`, 'text/csv');
});

$('exportJson').addEventListener('click', () => {
  download(`koltsegkoveto-mentes-${today()}.json`, JSON.stringify(state, null, 2), 'application/json');
});

/** Mentésfájlból érkező tételek ellenőrzése, hogy hibás adat ne kerüljön az adatbázisba. */
function sanitize(list) {
  return list
    .map((e) => ({
      amount: Math.round(Number(e.amount) * 100) / 100,
      date: String(e.date || ''),
      category: String(e.category || 'Egyéb').slice(0, 40),
      note: String(e.note || '').slice(0, 120),
    }))
    .filter((e) => e.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
}

$('importJson').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async () => {
  const file = $('importFile').files[0];
  $('importFile').value = '';
  if (!file) return;
  let data;
  try {
    data = JSON.parse(await file.text());
    if (!Array.isArray(data.expenses)) throw new Error();
  } catch {
    alert('Hibás mentésfájl.');
    return;
  }
  const expenses = sanitize(data.expenses);
  if (!confirm(`${expenses.length} tétel visszaállítása? A jelenlegi adatok felülíródnak.`)) return;
  try {
    await run(() => store.replaceAll(expenses, Number(data.budget) > 0 ? Number(data.budget) : 0));
    state = await run(() => store.load());
    render();
  } catch { /* run() már jelezte */ }
});

$('migrateBtn').addEventListener('click', async () => {
  const local = readLocal();
  $('migrateBtn').disabled = true;
  try {
    await run(() => store.addMany(sanitize(local.expenses)));
    if (local.budget > 0 && !state.budget) await run(() => store.setBudget(local.budget));
    clearLocal();
    state = await run(() => store.load());
    render();
    updateMigrateCard();
  } catch { /* run() már jelezte */ } finally {
    $('migrateBtn').disabled = false;
  }
});

// ---------- Indítás: helyi vagy Supabase mód ----------

async function initSupabase() {
  const { createClient } = await import(SUPABASE_JS);
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let currentUserId = null;

  const msg = (text, isError = false) => {
    $('authMsg').textContent = text;
    $('authMsg').classList.toggle('err', isError);
  };
  const creds = () => ({ email: $('authEmail').value.trim(), password: $('authPassword').value });

  $('authForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    msg('Belépés…');
    const { error } = await sb.auth.signInWithPassword(creds());
    if (error) msg(error.message === 'Invalid login credentials' ? 'Hibás e-mail vagy jelszó.' : error.message, true);
  });

  $('signupBtn').addEventListener('click', async () => {
    if (!$('authForm').reportValidity()) return;
    msg('Regisztráció…');
    const { data, error } = await sb.auth.signUp({ ...creds(), options: { emailRedirectTo: location.href } });
    if (error) msg(error.message, true);
    else if (!data.session) msg('Elküldtük a megerősítő e-mailt. Kattints a benne lévő linkre, utána be tudsz lépni.');
  });

  $('resetBtn').addEventListener('click', async () => {
    const email = $('authEmail').value.trim();
    if (!email) { msg('Előbb írd be az e-mail címed.', true); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href });
    msg(error ? error.message : 'Elküldtük a jelszó-visszaállító e-mailt.', Boolean(error));
  });

  $('logout').addEventListener('click', async () => {
    await sb.auth.signOut();
  });

  sb.auth.onAuthStateChange((event, session) => {
    // A Supabase ajánlása: ebben a callbackben ne várjunk más Supabase hívásra.
    setTimeout(async () => {
      if (event === 'PASSWORD_RECOVERY') {
        const pw = prompt('Add meg az új jelszavad (min. 6 karakter):');
        if (pw) {
          const { error } = await sb.auth.updateUser({ password: pw });
          alert(error ? `Hiba: ${error.message}` : 'Jelszó megváltoztatva.');
        }
      }
      const user = session?.user ?? null;
      $('who').hidden = !user;
      $('userEmail').textContent = user?.email ?? '';
      if (!user) {
        currentUserId = null;
        store = null;
        state = { expenses: [], budget: 0 };
        msg('');
        show('auth');
      } else if (user.id !== currentUserId) {
        currentUserId = user.id;
        startApp(new SupabaseStore(sb, user));
      }
    }, 0);
  });
}

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  initSupabase().catch((err) => {
    $('loading').textContent = `Nem sikerült csatlakozni az adatbázishoz: ${err.message}`;
  });
} else {
  startApp(new LocalStore());
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
