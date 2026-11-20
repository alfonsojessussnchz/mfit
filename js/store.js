/* Mfit · estado de la app en memoria + persistencia en la base de datos */
'use strict';

const Store = (() => {
  const defaultProfile = () => ({
    name: '', sex: 'm', age: null, heightCm: null, kg: null,
    waistCm: null, neckCm: null, hipCm: null,
    activity: 'mod', goal: 'maint', level: 'intermedio', days: 4,
  });

  const state = {
    profile: defaultProfile(),
    routine: null,     // {name, generated, notes, days:[{id,name,exercises:[{exId,sets,repMin,repMax,rest}]}]}
    active: null,      // entreno en curso
    sessions: [],      // [{id,date,dayId,dayName,durationMin,exercises:[{exId,sets:[{w,r}]}]}]
    bodyweights: [],   // [{id,date,kg}]
    foodlog: [],       // [{id,day:'YYYY-MM-DD',meal,name,foodId,grams,k,p,c,f}]
    measures: [],      // [{id,date,waistCm,neckCm,hipCm}]
    customFoods: [],   // alimentos creados por el usuario (mismo formato que FOODS)
  };

  const byDate = (a, b) => new Date(a.date) - new Date(b.date);

  async function init() {
    await DB.init();
    const data = await DB.loadAll();
    if (data.kv.profile) state.profile = Object.assign(defaultProfile(), data.kv.profile);
    state.routine = data.kv.routine || null;
    state.active = data.kv.active || null;
    state.sessions = (data.sessions || []).sort(byDate);
    state.bodyweights = (data.bodyweights || []).sort(byDate);
    state.foodlog = data.foodlog || [];
    state.measures = (data.measures || []).sort(byDate);
    state.customFoods = data.kv.customFoods || [];
  }

  const saveProfile = () => DB.setKV('profile', state.profile);
  const saveRoutine = () => DB.setKV('routine', state.routine);
  const saveActive  = () => DB.setKV('active', state.active);

  async function addSession(s) {
    state.sessions.push(s);
    state.sessions.sort(byDate);
    await DB.put('sessions', s);
  }
  async function deleteSession(id) {
    state.sessions = state.sessions.filter(s => s.id !== id);
    await DB.del('sessions', id);
  }

  async function addBodyweight(kg, date = new Date()) {
    const bw = { id: uid(), date: date.toISOString(), kg };
    state.bodyweights.push(bw);
    state.bodyweights.sort(byDate);
    await DB.put('bodyweights', bw);
    // el peso más reciente actualiza el perfil (para recalcular nutrición)
    const last = state.bodyweights[state.bodyweights.length - 1];
    if (last.id === bw.id) { state.profile.kg = kg; await saveProfile(); }
  }
  async function deleteBodyweight(id) {
    state.bodyweights = state.bodyweights.filter(b => b.id !== id);
    await DB.del('bodyweights', id);
  }

  // ---------- diario de comidas ----------
  const dayKey = (d = new Date()) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const allFoods = () => [...state.customFoods, ...FOODS];
  const foodById = id => allFoods().find(f => f.id === id);

  async function logFood({ day, meal, food, grams }) {
    const r = grams / 100;
    const e = {
      id: uid(), day, meal, foodId: food.id, name: food.name, grams,
      k: Math.round(food.k * r), p: +(food.p * r).toFixed(1), c: +(food.c * r).toFixed(1), f: +(food.f * r).toFixed(1),
    };
    state.foodlog.push(e);
    await DB.put('foodlog', e);
    return e;
  }
  async function logQuick({ day, meal, name, k, p = 0, c = 0, f = 0 }) {
    const e = { id: uid(), day, meal, foodId: null, name: name || 'Entrada rápida', grams: null, k, p, c, f };
    state.foodlog.push(e);
    await DB.put('foodlog', e);
  }
  async function deleteFoodEntry(id) {
    state.foodlog = state.foodlog.filter(e => e.id !== id);
    await DB.del('foodlog', id);
  }
  const foodsOn = day => state.foodlog.filter(e => e.day === day);
  function dayTotals(day) {
    return foodsOn(day).reduce((t, e) => ({ k: t.k + e.k, p: t.p + e.p, c: t.c + e.c, f: t.f + e.f }), { k: 0, p: 0, c: 0, f: 0 });
  }
  async function copyDay(fromDay, toDay) {
    const src = foodsOn(fromDay);
    for (const e of src) {
      const n = { ...e, id: uid(), day: toDay };
      state.foodlog.push(n);
      await DB.put('foodlog', n);
    }
    return src.length;
  }
  async function addCustomFood(food) {
    const f = { ...food, id: 'u_' + uid(), cat: 'Mis alimentos', custom: true };
    state.customFoods.unshift(f);
    await DB.setKV('customFoods', state.customFoods);
    return f;
  }
  async function deleteCustomFood(id) {
    state.customFoods = state.customFoods.filter(f => f.id !== id);
    await DB.setKV('customFoods', state.customFoods);
  }

  // ---------- medidas ----------
  async function addMeasure(m) {
    const e = { id: uid(), date: new Date().toISOString(), ...m };
    state.measures.push(e);
    await DB.put('measures', e);
    Object.assign(state.profile, Object.fromEntries(Object.entries(m).filter(([, v]) => v)));
    await saveProfile();
  }
  async function deleteMeasure(id) {
    state.measures = state.measures.filter(m => m.id !== id);
    await DB.del('measures', id);
  }
  // peso más cercano a una fecha
  function weightAt(date) {
    const t = +new Date(date);
    let best = null;
    state.bodyweights.forEach(b => { if (!best || Math.abs(+new Date(b.date) - t) < Math.abs(+new Date(best.date) - t)) best = b; });
    return best ? best.kg : state.profile.kg;
  }

  // Historial de un ejercicio (más reciente primero)
  function historyFor(exId) {
    const out = [];
    for (let i = state.sessions.length - 1; i >= 0; i--) {
      const s = state.sessions[i];
      const e = s.exercises.find(x => x.exId === exId);
      if (e && e.sets.some(st => st.r > 0)) out.push({ date: s.date, sets: e.sets });
    }
    return out;
  }

  // Siguiente día de la rutina (el que va después del último entrenado)
  function nextDay() {
    const days = state.routine?.days || [];
    if (!days.length) return null;
    for (let i = state.sessions.length - 1; i >= 0; i--) {
      const idx = days.findIndex(d => d.id === state.sessions[i].dayId);
      if (idx >= 0) return days[(idx + 1) % days.length];
    }
    return days[0];
  }

  function exportJSON() {
    return JSON.stringify({
      app: 'mfit', version: 1, exportedAt: new Date().toISOString(),
      profile: state.profile, routine: state.routine,
      sessions: state.sessions, bodyweights: state.bodyweights,
      foodlog: state.foodlog, measures: state.measures, customFoods: state.customFoods,
    }, null, 2);
  }

  async function importJSON(text) {
    const data = JSON.parse(text);
    if (data.app !== 'mfit') throw new Error('El archivo no es una copia de Mfit');
    await DB.clearAll();
    state.profile = Object.assign(defaultProfile(), data.profile || {});
    state.routine = data.routine || null;
    state.active = null;
    state.sessions = (data.sessions || []).sort(byDate);
    state.bodyweights = (data.bodyweights || []).sort(byDate);
    state.foodlog = data.foodlog || [];
    state.measures = (data.measures || []).sort(byDate);
    state.customFoods = data.customFoods || [];
    await saveProfile(); await saveRoutine(); await saveActive();
    await DB.setKV('customFoods', state.customFoods);
    for (const st of ['sessions', 'bodyweights', 'foodlog', 'measures']) {
      for (const o of state[st]) await DB.put(st, o);
    }
  }

  async function resetAll() {
    await DB.clearAll();
    state.profile = defaultProfile();
    state.routine = null; state.active = null;
    state.sessions = []; state.bodyweights = [];
    state.foodlog = []; state.measures = []; state.customFoods = [];
  }

  return {
    state, init, saveProfile, saveRoutine, saveActive,
    addSession, deleteSession, addBodyweight, deleteBodyweight,
    historyFor, nextDay, exportJSON, importJSON, resetAll,
    dayKey, allFoods, foodById, logFood, logQuick, deleteFoodEntry, foodsOn, dayTotals, copyDay,
    addCustomFood, deleteCustomFood, addMeasure, deleteMeasure, weightAt,
  };
})();
