// Adattárolás: két megvalósítás azonos felülettel.
//  - LocalStore: böngésző localStorage (ha nincs Supabase beállítva)
//  - SupabaseStore: felhős Postgres adatbázis bejelentkezéssel
//
// Az app egységes alakban kezeli a kiadásokat:
//   { id, amount, date: 'YYYY-MM-DD', category, note, created: ms }

const LOCAL_KEY = 'koltsegkoveto.v1';

export function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || { expenses: [], budget: 0 }; }
  catch { return { expenses: [], budget: 0 }; }
}
export function clearLocal() {
  try { localStorage.removeItem(LOCAL_KEY); } catch { /* nincs teendő */ }
}

const newId = () => crypto.randomUUID?.() || String(Date.now() + Math.random());

export class LocalStore {
  label = 'Az adatok csak ezen az eszközön, a böngészőben tárolódnak. Készíts időnként mentést!';
  #data = readLocal();
  #persist() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(this.#data)); }
    catch { throw new Error('Nem sikerült menteni a böngészőbe.'); }
  }
  async load() { return structuredClone(this.#data); }
  async add(e) {
    const row = { id: newId(), created: Date.now(), ...e };
    this.#data.expenses.push(row); this.#persist(); return row;
  }
  async update(id, e) {
    Object.assign(this.#data.expenses.find((x) => x.id === id), e); this.#persist();
  }
  async remove(id) {
    this.#data.expenses = this.#data.expenses.filter((x) => x.id !== id); this.#persist();
  }
  async setBudget(budget) { this.#data.budget = budget; this.#persist(); }
  async replaceAll(expenses, budget) {
    this.#data = { expenses: expenses.map((e) => ({ id: newId(), created: Date.now(), ...e })), budget };
    this.#persist();
  }
}

const COLS = 'id,amount,spent_on,category,note,created_at';
const fromRow = (r) => ({
  id: r.id, amount: Number(r.amount), date: r.spent_on, category: r.category,
  note: r.note || '', created: Date.parse(r.created_at),
});
const toRow = (e) => ({
  amount: e.amount, spent_on: e.date, category: e.category, note: (e.note || '').slice(0, 120),
});
const check = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export class SupabaseStore {
  label = 'Az adatok a felhőben (Supabase) tárolódnak, minden eszközödön elérhetők.';
  constructor(client, user) { this.sb = client; this.user = user; }

  async load() {
    // A Supabase API alapból max. 1000 sort ad vissza egyszerre → lapozunk.
    const expenses = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const rows = check(await this.sb.from('expenses').select(COLS)
        .order('spent_on', { ascending: false }).order('created_at', { ascending: false })
        .range(from, from + PAGE - 1));
      expenses.push(...rows.map(fromRow));
      if (rows.length < PAGE) break;
    }
    const s = check(await this.sb.from('settings').select('budget').maybeSingle());
    return { expenses, budget: s ? Number(s.budget) : 0 };
  }
  async add(e) {
    return fromRow(check(await this.sb.from('expenses').insert(toRow(e)).select(COLS).single()));
  }
  async update(id, e) {
    check(await this.sb.from('expenses').update(toRow(e)).eq('id', id));
  }
  async remove(id) {
    check(await this.sb.from('expenses').delete().eq('id', id));
  }
  async setBudget(budget) {
    check(await this.sb.from('settings').upsert({ user_id: this.user.id, budget }));
  }
  async addMany(expenses) {
    for (let i = 0; i < expenses.length; i += 500) {
      check(await this.sb.from('expenses').insert(expenses.slice(i, i + 500).map(toRow)));
    }
  }
  async replaceAll(expenses, budget) {
    check(await this.sb.from('expenses').delete().eq('user_id', this.user.id));
    await this.addMany(expenses);
    await this.setBudget(budget);
  }
}
