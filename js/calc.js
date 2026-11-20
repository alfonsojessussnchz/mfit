/* Mfit · cálculos: nutrición, progresión, generador de rutina por volumen y estadísticas */
'use strict';

const Calc = (() => {
  const round = (x, d = 0) => { const p = 10 ** d; return Math.round(x * p) / p; };

  // ================= NUTRICIÓN =================
  const ACTIVITY = {
    sed:   { name: 'Sedentario',  desc: 'Trabajo sentado, poco movimiento', f: 1.2 },
    light: { name: 'Ligero',      desc: 'Entrenas 1–3 días/semana',          f: 1.375 },
    mod:   { name: 'Moderado',    desc: 'Entrenas 3–5 días/semana',          f: 1.55 },
    high:  { name: 'Alto',        desc: 'Entrenas 6–7 días/semana',          f: 1.725 },
    vhigh: { name: 'Muy alto',    desc: 'Trabajo físico + entreno diario',   f: 1.9 },
  };
  const GOALS = {
    cut:   { name: 'Definición', desc: 'Perder grasa (−20 % kcal)', kcal: 0.80, prot: 2.2 },
    maint: { name: 'Mantener',   desc: 'Recomposición / mantenimiento', kcal: 1.00, prot: 1.8 },
    bulk:  { name: 'Volumen',    desc: 'Ganar músculo (+10 % kcal)', kcal: 1.10, prot: 1.8 },
  };

  const bmi = (kg, cm) => kg / ((cm / 100) ** 2);

  // % grasa por el método de la Marina de EE. UU. (medidas en cm)
  function navyBodyFat({ sex, heightCm, waistCm, neckCm, hipCm }) {
    if (!heightCm || !waistCm || !neckCm) return null;
    if (sex === 'm') {
      const d = waistCm - neckCm;
      if (d <= 0) return null;
      return 495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(heightCm)) - 450;
    }
    if (!hipCm) return null;
    const d = waistCm + hipCm - neckCm;
    if (d <= 0) return null;
    return 495 / (1.29579 - 0.35004 * Math.log10(d) + 0.22100 * Math.log10(heightCm)) - 450;
  }

  // Estimación por IMC (Deurenberg) cuando no hay medidas de cinta
  const bmiBodyFat = ({ sex, age, kg, heightCm }) => 1.2 * bmi(kg, heightCm) + 0.23 * age - 10.8 * (sex === 'm' ? 1 : 0) - 5.4;

  // Metabolismo basal: Mifflin–St Jeor
  const bmrMifflin = ({ sex, age, kg, heightCm }) => 10 * kg + 6.25 * heightCm - 5 * age + (sex === 'm' ? 5 : -161);

  const profileReady = p => !!(p && p.age > 0 && p.kg > 0 && p.heightCm > 0);

  function nutrition(p) {
    if (!profileReady(p)) return null;
    const act = ACTIVITY[p.activity] || ACTIVITY.mod;
    const goal = GOALS[p.goal] || GOALS.maint;
    const navy = navyBodyFat(p);
    const bf = navy != null && navy > 2 && navy < 60 ? navy : bmiBodyFat(p);
    const bfMethod = navy != null && navy > 2 && navy < 60 ? 'método Marina EE. UU. (medidas)' : 'estimado a partir del IMC, edad y sexo (orientativo)';
    const lbm = p.kg * (1 - bf / 100);
    const bmr = bmrMifflin(p);
    const tdee = bmr * act.f;
    const kcal = tdee * goal.kcal;
    const protein = goal.prot * p.kg;
    const fat = Math.max(0.8 * p.kg, (kcal * 0.25) / 9);
    const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
    return {
      bmi: round(bmi(p.kg, p.heightCm), 1),
      bf: round(bf, 1), bfMethod,
      lbm: round(lbm, 1), fatMass: round(p.kg - lbm, 1),
      bmr: round(bmr), tdee: round(tdee), kcal: round(kcal / 10) * 10,
      protein: round(protein), fat: round(fat), carbs: round(carbs),
      pct: {
        protein: round((protein * 4 / kcal) * 100),
        fat: round((fat * 9 / kcal) * 100),
        carbs: round((carbs * 4 / kcal) * 100),
      },
    };
  }

  function bmiLabel(b) {
    if (b < 18.5) return 'Bajo peso';
    if (b < 25) return 'Normal';
    if (b < 30) return 'Sobrepeso';
    return 'Obesidad';
  }

  // ================= FUERZA / PROGRESIÓN =================
  // 1RM estimado (Epley)
  const e1rm = (w, r) => (!w || !r) ? 0 : (r === 1 ? w : w * (1 + r / 30));

  const roundTo = (x, step) => step > 0 ? Math.round(x / step) * step : x;

  /*
   * Doble progresión:
   *  - Si en la última sesión llegaste al tope del rango en TODAS las series → sube peso.
   *  - Si no llegaste al mínimo en alguna serie → mantén; si te pasa 2 sesiones seguidas con el mismo peso → baja un 10 %.
   *  - Si estás dentro del rango → mantén el peso e intenta sumar reps.
   * history: [{date, sets:[{w,r}]}] de más reciente a más antigua.
   */
  function suggest(cfg, history, ex) {
    const inc = ex.inc ?? (ex.type === 'C' ? 2.5 : 1);
    if (!history.length) {
      return { kind: 'new', weight: null, text: `Primera vez: elige un peso con el que llegues a ${cfg.repMax} reps dejando 1–2 en recámara.` };
    }
    const sets = history[0].sets.filter(s => s.r > 0);
    if (!sets.length) return { kind: 'new', weight: null, text: 'Sin datos válidos de la última sesión.' };
    const w = Math.max(...sets.map(s => s.w || 0));
    const working = sets.filter(s => (s.w || 0) === w);
    const fails = working.filter(s => s.r < cfg.repMin).length;

    if (working.length >= cfg.sets && working.every(s => s.r >= cfg.repMax) && inc > 0) {
      const nw = round(w + inc, 2);
      return { kind: 'up', weight: nw, text: `Hiciste ${cfg.repMax}+ reps en todas las series con ${fmtW(w, ex)} → sube a ${fmtW(nw, ex)}.` };
    }
    if (working.length >= cfg.sets && working.every(s => s.r >= cfg.repMax) && inc === 0) {
      return { kind: 'up', weight: w, text: `Tope del rango alcanzado: añade una serie o haz las reps más lentas.` };
    }
    if (fails > 0) {
      const prev = history[1];
      if (prev) {
        const ps = prev.sets.filter(s => s.r > 0);
        const pw = ps.length ? Math.max(...ps.map(s => s.w || 0)) : null;
        const pf = ps.filter(s => (s.w || 0) === pw && s.r < cfg.repMin).length;
        if (pw === w && pf > 0 && w > 0) {
          const nw = Math.max(0, roundTo(w * 0.9, inc || 1));
          return { kind: 'down', weight: nw, text: `Dos sesiones seguidas sin llegar a ${cfg.repMin} reps con ${fmtW(w, ex)} → baja a ${fmtW(nw, ex)} y vuelve a construir.` };
        }
      }
      return { kind: 'hold', weight: w, text: `Mantén ${fmtW(w, ex)}: en ${fails} serie(s) no llegaste a ${cfg.repMin} reps.` };
    }
    return { kind: 'hold', weight: w, text: `Mantén ${fmtW(w, ex)} y suma 1 rep por serie hasta llegar a ${cfg.repMax}.` };
  }

  function fmtNum(n) {
    if (n == null || isNaN(n)) return '–';
    return Number.isInteger(n) ? String(n) : String(round(n, 2)).replace('.', ',');
  }
  function fmtW(w, ex) {
    if (ex && ex.bw) return w > 0 ? `+${fmtNum(w)} kg de lastre` : 'peso corporal';
    return `${fmtNum(w)} kg`;
  }

  // ================= GENERADOR DE RUTINA POR VOLUMEN =================
  function targetFor(level, goal, muscle) {
    const [mn, mx] = VOLUME[level][muscle];
    const t = goal === 'cut' ? mn + (mx - mn) * 0.25 : (mn + mx) / 2;
    return Math.round(t);
  }

  function splitSets(n, type) {
    const max = type === 'C' ? 4 : 3;
    if (n <= 0) return [];
    if (n <= max) return [n];
    const parts = Math.ceil(n / max);
    const base = Math.floor(n / parts);
    const out = Array(parts).fill(base);
    for (let i = 0; i < n - base * parts; i++) out[i]++;
    return out;
  }

  // Pool de ejercicios de un músculo: compuestos primero
  function pool(muscle) {
    const ids = Object.keys(EXERCISES).filter(id => EXERCISES[id].m === muscle);
    return {
      C: ids.filter(id => EXERCISES[id].type === 'C'),
      I: ids.filter(id => EXERCISES[id].type === 'I'),
    };
  }

  /*
   * generate({level, days, goal}) → rutina
   * 1. Elige la división según los días.
   * 2. Para cada músculo calcula el objetivo semanal de series y su frecuencia (días que se entrena).
   * 3. Programa primero los músculos grandes (compuestos), calcula el volumen indirecto que generan
   *    y descuenta ese volumen a los pequeños (bíceps, tríceps, glúteo…).
   * 4. Recorta cada sesión al máximo de series del nivel, quitando de los músculos más sobrados.
   */
  function generate({ level = 'intermedio', days = 4, goal = 'maint' }) {
    days = Math.min(6, Math.max(2, +days || 4));
    const split = SPLITS[days];
    const lv = LEVELS[level] || LEVELS.intermedio;
    const freq = {};
    split.days.forEach(k => SPLIT_DAYS[k].muscles.forEach(m => { freq[m] = (freq[m] || 0) + 1; }));

    const target = {};
    Object.keys(MUSCLES).forEach(m => { target[m] = targetFor(level, goal, m); });

    // plan[d][muscle] = series de ese músculo ese día
    const plan = split.days.map(() => ({}));
    const occurrence = {}; // cuántas veces llevamos programado el músculo (para variar ejercicios)
    const dayEx = split.days.map(() => []);
    const indirect = {};
    Object.keys(MUSCLES).forEach(m => { indirect[m] = 0; });

    const bigs = MUSCLE_ORDER.filter(m => MUSCLES[m].big);
    const smalls = MUSCLE_ORDER.filter(m => !MUSCLES[m].big);

    function program(muscle, weeklySets) {
      const f = freq[muscle] || 0;
      if (!f || weeklySets <= 0) return;
      // días que entrenan este músculo; si salen <2 series por sesión, concentrar en menos días
      const idx = split.days.map((k, d) => SPLIT_DAYS[k].muscles.includes(muscle) ? d : -1).filter(d => d >= 0);
      const fe = Math.max(1, Math.min(f, Math.floor(weeklySets / 2)));
      const offset = (MUSCLE_ORDER.indexOf(muscle) % idx.length); // alterna en qué días caen los pequeños
      const chosen = [];
      for (let i = 0; i < fe; i++) chosen.push(idx[(Math.floor(i * idx.length / fe) + (fe < idx.length ? offset : 0)) % idx.length]);
      const per = Array(fe).fill(Math.floor(weeklySets / fe));
      for (let i = 0; i < weeklySets - per[0] * fe; i++) per[i]++;
      chosen.sort((a, b) => a - b).forEach((d, i) => { plan[d][muscle] = Math.max(2, per[i]); });
    }

    function pickExercises(d, muscle, n) {
      const p = pool(muscle);
      const occ = occurrence[muscle] = (occurrence[muscle] || 0) + 1;
      const big = MUSCLES[muscle].big;
      const out = [];
      if (big && p.C.length) {
        const chunks = splitSets(n, 'C');
        chunks.forEach((s, i) => {
          // 1er ejercicio: compuesto rotando; 2º: aislamiento si hay, si no otro compuesto
          let id;
          if (i === 0) id = p.C[(occ - 1) % p.C.length];
          else if (p.I.length && i === chunks.length - 1) id = p.I[(occ - 1) % p.I.length];
          else id = p.C[(occ - 1 + i) % p.C.length];
          out.push([id, s]);
        });
      } else {
        // pequeños: el primer día con compuesto (si hay) para hombro/glúteo, resto aislamiento
        const list = (muscle === 'hombros' || muscle === 'gluteo') ? [...p.C, ...p.I] : [...p.I, ...p.C];
        splitSets(n, 'I').forEach((s, i) => {
          const id = list[(occ - 1 + i) % list.length];
          out.push([id, s]);
        });
      }
      return out;
    }

    // 1) Grandes
    bigs.forEach(m => program(m, target[m]));
    // volumen indirecto que generan los compuestos de los grandes
    split.days.forEach((_, d) => {
      bigs.forEach(m => {
        if (!plan[d][m]) return;
        const exs = pickExercises(d, m, plan[d][m]);
        exs.forEach(([id, s]) => {
          dayEx[d].push({ exId: id, sets: s });
          (EXERCISES[id].sec || []).forEach(sm => { indirect[sm] += s * 0.5; });
        });
      });
    });
    // 2) Pequeños: objetivo menos indirecto (mínimo 2 series directas/semana si se entrena ese músculo)
    smalls.forEach(m => {
      const need = Math.max(freq[m] ? 2 : 0, Math.round(target[m] - indirect[m]));
      program(m, need);
    });
    split.days.forEach((_, d) => {
      smalls.forEach(m => {
        if (!plan[d][m]) return;
        pickExercises(d, m, plan[d][m]).forEach(([id, s]) => dayEx[d].push({ exId: id, sets: s }));
      });
    });

    // 3) Recorte por sesión
    const notes = [];
    const prio = id => MUSCLE_ORDER.indexOf(EXERCISES[id].m); // mayor = menos prioritario
    let trimmed = false;
    dayEx.forEach((list, d) => {
      let total = list.reduce((a, e) => a + e.sets, 0);
      let guard = 200;
      while (total > lv.cap && guard--) {
        trimmed = true;
        // 1º quitar series a ejercicios con más de 2 (aislamientos antes que compuestos)
        const cands = list.filter(e => e.sets > 2);
        if (cands.length) {
          cands.sort((a, b) => (EXERCISES[b.exId].type === 'I') - (EXERCISES[a.exId].type === 'I') || b.sets - a.sets || prio(b.exId) - prio(a.exId));
          cands[0].sets--; total--;
          continue;
        }
        // 2º quitar el aislamiento del músculo menos prioritario (todo el ejercicio, nunca series sueltas)
        const iso = list.filter(e => e.sets > 0 && EXERCISES[e.exId].type === 'I').sort((a, b) => prio(b.exId) - prio(a.exId));
        const victim = iso[0] || list.filter(e => e.sets > 0).sort((a, b) => prio(b.exId) - prio(a.exId))[0];
        if (!victim) break;
        total -= victim.sets; victim.sets = 0;
      }
    });
    if (trimmed) notes.push(`Algunas sesiones se han recortado a ${lv.cap} series para que no pasen de ~75 min.`);

    // 4) Construir rutina final, compuestos primero, sin duplicados en el mismo día
    const routine = {
      name: split.name,
      generated: { level, days, goal, date: new Date().toISOString() },
      notes,
      days: split.days.map((key, d) => {
        const merged = [];
        dayEx[d].forEach(e => {
          const prev = merged.find(x => x.exId === e.exId);
          if (prev) prev.sets += e.sets; else merged.push({ ...e });
        });
        merged.sort((a, b) => (EXERCISES[a.exId].type === 'C' ? 0 : 1) - (EXERCISES[b.exId].type === 'C' ? 0 : 1));
        const sameName = split.days.filter(k => k === key).length > 1;
        const letter = sameName ? ' ' + 'ABC'[split.days.slice(0, d + 1).filter(k => k === key).length - 1] : '';
        return {
          id: uid(),
          name: SPLIT_DAYS[key].name + letter,
          exercises: merged.filter(e => e.sets > 0).map(e => {
            const ex = EXERCISES[e.exId];
            let [repMin, repMax] = ex.reps;
            if (goal === 'cut' && ex.type === 'C' && repMin < 6) { repMin = 5; } // mantener fuerza en definición
            return { exId: e.exId, sets: e.sets, repMin, repMax, rest: ex.rest };
          }),
        };
      }),
    };
    const low = weeklyVolume(routine, level).filter(v => v.status === 'low');
    if (low.length >= 3) {
      notes.push(`Con ${days} días no llegas al volumen recomendado en ${low.length} grupos musculares (${low.map(v => v.name).join(', ')}). Si puedes, entrena un día más.`);
    } else if (low.length) {
      notes.push(`Volumen algo bajo en: ${low.map(v => v.name).join(', ')}. Puedes añadir 1–2 series a mano.`);
    }
    return routine;
  }

  // Volumen semanal de una rutina (directo + 0,5 × indirecto) frente al objetivo
  function weeklyVolume(routine, level = 'intermedio') {
    const vol = {};
    Object.keys(MUSCLES).forEach(m => { vol[m] = { direct: 0, indirect: 0 }; });
    (routine?.days || []).forEach(d => d.exercises.forEach(e => {
      const ex = EXERCISES[e.exId];
      if (!ex) return;
      vol[ex.m].direct += +e.sets || 0;
      (ex.sec || []).forEach(m => { vol[m].indirect += (+e.sets || 0) * 0.5; });
    }));
    return MUSCLE_ORDER.map(m => {
      const total = vol[m].direct + vol[m].indirect;
      const [mn, mx] = (VOLUME[level] || VOLUME.intermedio)[m];
      const status = total < mn ? 'low' : total > mx ? 'high' : 'ok';
      return { muscle: m, name: MUSCLES[m].name, direct: vol[m].direct, indirect: vol[m].indirect, total, min: mn, max: mx, status };
    });
  }

  // ================= ESTADÍSTICAS =================
  function startOfWeek(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function range(mode, offset = 0, now = new Date()) {
    if (mode === 'week') {
      const s = startOfWeek(now); s.setDate(s.getDate() + offset * 7);
      const e = new Date(s); e.setDate(e.getDate() + 7);
      return [s, e];
    }
    const s = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const e = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    return [s, e];
  }
  function summarize(sessions, [s, e]) {
    const list = sessions.filter(x => { const d = new Date(x.date); return d >= s && d < e; });
    let sets = 0, volume = 0, reps = 0;
    const best = {};
    list.forEach(ses => ses.exercises.forEach(ex => ex.sets.forEach(st => {
      if (!(st.r > 0)) return;
      sets++; reps += st.r; volume += (st.w || 0) * st.r;
      const v = e1rm(st.w || 0, st.r);
      if (!best[ex.exId] || v > best[ex.exId]) best[ex.exId] = v;
    })));
    return { sessions: list.length, sets, reps, volume: round(volume), best };
  }
  function periodLabel(mode, [s, e]) {
    const opts = { day: 'numeric', month: 'short' };
    if (mode === 'week') {
      const end = new Date(e); end.setDate(end.getDate() - 1);
      return `${s.toLocaleDateString('es-ES', opts)} – ${end.toLocaleDateString('es-ES', opts)}`;
    }
    const t = s.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  return {
    ACTIVITY, GOALS, nutrition, bmiLabel, profileReady, navyBodyFat,
    e1rm, suggest, fmtW, fmtNum, round,
    generate, weeklyVolume, splitSets,
    range, summarize, periodLabel, startOfWeek,
  };
})();

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
