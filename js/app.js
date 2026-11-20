/* Mfit · interfaz */
'use strict';

(() => {
  const $ = s => document.querySelector(s);
  const view = $('#view');
  const S = Store.state;

  // Medidas de cinta (cintura/cuello/cadera): ocultas por ahora. Poner a true para recuperarlas.
  const SHOW_MEASURES = false;
  const nutri = p => Calc.nutrition(SHOW_MEASURES ? p : { ...p, waistCm: null, neckCm: null, hipCm: null });

  const ui = { tab: 'home', progMode: 'week', progEx: null, nutMode: 'day', day: null, addMeal: null, pick: null, q: '', panel: null };

  const TITLES = { home: 'Mfit', train: 'Entrenar', progress: 'Progreso', nutrition: 'Nutrición', routine: 'Rutina', settings: 'Ajustes' };

  // ---------- utilidades ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };
  const fmt = Calc.fmtNum;
  const fmtInt = n => Math.round(n || 0).toLocaleString('es-ES');
  const fmtDate = d => new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const restTxt = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s} s`;
  const ex = id => EXERCISES[id] || { name: id, m: 'abdomen', type: 'I', reps: [8, 12], rest: 60, tip: '' };

  function toast(msg, ms = 2600) {
    const t = $('#toast');
    t.innerHTML = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), ms);
  }

  function delta(cur, prev, suffix = '') {
    if (!prev) return cur ? '<span class="delta up">nuevo</span>' : '';
    if (!cur) return '';
    const p = Math.round(((cur - prev) / prev) * 100);
    if (p === 0) return '<span class="delta">=</span>';
    return `<span class="delta ${p > 0 ? 'up' : 'down'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p)} %${suffix}</span>`;
  }

  const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const SUGG_ICON = { up: '▲', hold: '＝', down: '▼', new: '★' };

  // ---------- render ----------
  function go(tab) {
    ui.tab = tab;
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    $('#title').textContent = TITLES[ui.tab];
    document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
    $('#btn-settings').classList.toggle('active', ui.tab === 'settings');
    view.innerHTML = VIEWS[ui.tab]();
  }

  // =====================================================================
  // INICIO
  // =====================================================================
  function viewHome() {
    let h = '';
    const ready = Calc.profileReady(S.profile);
    const hi = S.profile.name ? `Hola, ${esc(S.profile.name)} 👋` : 'Hola 👋';
    h += `<p class="hello">${hi}</p>`;

    if (!ready || !S.routine) {
      h += `<section class="card onboarding">
        <h2>Empecemos</h2>
        <ol class="steps">
          <li class="${ready ? 'done' : ''}"><b>Tu perfil</b> — peso, altura y objetivo.
            ${ready ? '<span class="pill ok">Hecho</span>' : '<button class="btn sm" data-action="go" data-to="nutrition">Completar</button>'}</li>
          <li class="${S.routine ? 'done' : ''}"><b>Tu rutina</b> — se genera según tu nivel y días disponibles.
            ${S.routine ? '<span class="pill ok">Hecho</span>' : '<button class="btn sm" data-action="go" data-to="routine">Generar</button>'}</li>
        </ol>
      </section>`;
    }

    if (S.active) {
      const done = S.active.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
      h += `<section class="card accent">
        <div class="row between"><div><span class="kicker">Entreno en curso</span><h2>${esc(S.active.dayName)}</h2>
        <p class="muted small">${done} series completadas</p></div>
        <button class="btn" data-action="go" data-to="train">Continuar</button></div>
      </section>`;
    } else if (S.routine) {
      const next = Store.nextDay();
      if (next) {
        h += `<section class="card">
          <span class="kicker">Próximo entreno</span>
          <div class="row between"><h2>${esc(next.name)}</h2><span class="muted small">${next.exercises.reduce((a, e) => a + e.sets, 0)} series</span></div>
          <ul class="next-list">
            ${next.exercises.map(e => {
              const sg = Calc.suggest(e, Store.historyFor(e.exId), ex(e.exId));
              return `<li><span class="sg sg-${sg.kind}" title="${esc(sg.text)}">${SUGG_ICON[sg.kind]}</span>
                <span class="grow">${esc(ex(e.exId).name)}<small class="muted">${e.sets} × ${e.repMin}–${e.repMax}${sg.weight != null ? ' · ' + esc(Calc.fmtW(sg.weight, ex(e.exId))) : ''}</small></span></li>`;
            }).join('')}
          </ul>
          <p class="legend small muted"><span class="sg sg-up">▲</span> subir peso <span class="sg sg-hold">＝</span> mantener <span class="sg sg-down">▼</span> bajar <span class="sg sg-new">★</span> primera vez</p>
          <button class="btn block" data-action="start" data-day="${next.id}">Empezar entreno</button>
        </section>`;
      }
    }

    // Semana
    const cur = Calc.summarize(S.sessions, Calc.range('week', 0));
    const prev = Calc.summarize(S.sessions, Calc.range('week', -1));
    const goalDays = S.routine?.days.length || S.profile.days || 0;
    h += `<section class="card">
      <div class="row between"><span class="kicker">Esta semana</span><button class="link" data-action="go" data-to="progress">Ver progreso ›</button></div>
      <div class="stats">
        <div><b>${cur.sessions}${goalDays ? `<small>/${goalDays}</small>` : ''}</b><span>entrenos</span></div>
        <div><b>${cur.sets}</b><span>series ${delta(cur.sets, prev.sets)}</span></div>
        <div><b>${fmtInt(cur.volume)}</b><span>kg volumen</span></div>
      </div>
      ${goalDays ? `<div class="progress-bar"><i style="width:${Math.min(100, cur.sessions / goalDays * 100)}%"></i></div>` : ''}
    </section>`;

    // Nutrición
    const n = nutri(S.profile);
    if (n) {
      h += `<section class="card">
        <div class="row between"><span class="kicker">Objetivo diario · ${Calc.GOALS[S.profile.goal].name}</span><button class="link" data-action="quick-diary">Diario ›</button></div>
        ${(() => { const t = Store.dayTotals(Store.dayKey()); return `
        <div class="kcal"><b>${fmtInt(t.k)}</b> / ${fmtInt(n.kcal)} kcal hoy</div>
        ${macroBar('Proteína', 'm-prot', t.p, n.protein)}
        ${macroBar('Carbohidratos', 'm-carb', t.c, n.carbs)}
        ${macroBar('Grasas', 'm-fat', t.f, n.fat)}`; })()}
        <button class="btn ghost block" data-action="quick-diary">Apuntar comida</button>
      </section>`;
    }

    // Peso
    if (S.bodyweights.length) {
      const last = S.bodyweights[S.bodyweights.length - 1];
      const weekAgo = [...S.bodyweights].reverse().find(b => (new Date(last.date) - new Date(b.date)) >= 6 * 864e5);
      const diff = weekAgo ? Calc.round(last.kg - weekAgo.kg, 1) : null;
      h += `<section class="card row between">
        <div><span class="kicker">Peso actual</span><h2>${fmt(last.kg)} kg</h2>
        ${diff != null ? `<p class="small muted">${diff > 0 ? '+' : ''}${fmt(diff)} kg en ~1 semana</p>` : ''}</div>
        <button class="btn ghost sm" data-action="go" data-to="progress">Registrar</button>
      </section>`;
    }
    return h;
  }

  // =====================================================================
  // ENTRENAR
  // =====================================================================
  function viewTrain() {
    if (!S.routine) {
      return `<section class="card empty"><h2>Aún no tienes rutina</h2><p class="muted">Genérala en un momento según tu nivel y tus días.</p>
        <button class="btn" data-action="go" data-to="routine">Generar rutina</button></section>`;
    }
    if (!S.active) {
      const next = Store.nextDay();
      return `<p class="muted small pad">Elige el día que vas a entrenar:</p>` + S.routine.days.map(d => {
        const last = [...S.sessions].reverse().find(s => s.dayId === d.id);
        return `<section class="card day-pick ${next && next.id === d.id ? 'is-next' : ''}">
          <div class="row between"><div>
            <h3>${esc(d.name)} ${next && next.id === d.id ? '<span class="pill">Toca hoy</span>' : ''}</h3>
            <p class="muted small">${d.exercises.length} ejercicios · ${d.exercises.reduce((a, e) => a + e.sets, 0)} series${last ? ' · último: ' + fmtDate(last.date) : ''}</p>
          </div>
          <button class="btn sm" data-action="start" data-day="${d.id}">Empezar</button></div>
        </section>`;
      }).join('');
    }

    const a = S.active;
    const mins = Math.round((Date.now() - new Date(a.start)) / 60000);
    let h = `<section class="session-head card accent">
      <div><span class="kicker">En curso · ${mins} min</span><h2>${esc(a.dayName)}</h2></div>
    </section>`;

    a.exercises.forEach((e, i) => {
      const X = ex(e.exId);
      const hist = Store.historyFor(e.exId);
      const last = hist[0];
      const doneAll = e.sets.length && e.sets.every(s => s.done);
      h += `<section class="card ex ${doneAll ? 'ex-done' : ''}">
        <div class="ex-head">
          <div><h3>${esc(X.name)}</h3>
          <p class="muted small">${e.target.sets} × ${e.target.repMin}–${e.target.repMax} reps · descanso ${restTxt(e.target.rest)} · ${MUSCLES[X.m].name}</p></div>
        </div>
        <div class="sugg sg-${e.sugg.kind}"><span>${SUGG_ICON[e.sugg.kind]}</span> ${esc(e.sugg.text)}</div>
        ${last ? `<p class="small muted">Última vez (${fmtDate(last.date)}): ${last.sets.map(s => (X.bw && !s.w ? '' : fmt(s.w) + '×') + s.r).join(', ')}</p>` : ''}
        <details class="tip"><summary>Técnica</summary><p>${esc(X.tip)}</p></details>
        ${warmup(e, X, i, a)}
        <div class="sets">
          <div class="set-row head"><span>Serie</span><span>${X.bw ? 'Lastre kg' : 'kg'}</span><span>Reps</span><span></span></div>
          ${e.sets.map((s, j) => `<div class="set-row ${s.done ? 'done' : ''}">
            <span class="set-n">${j + 1}</span>
            <input type="text" inputmode="decimal" data-set="w" data-i="${i}" data-j="${j}" value="${s.w ?? ''}" placeholder="${e.sugg.weight ?? (X.bw ? '0' : 'kg')}" aria-label="Peso serie ${j + 1}">
            <input type="text" inputmode="numeric" data-set="r" data-i="${i}" data-j="${j}" value="${s.r ?? ''}" placeholder="${e.target.repMax}" aria-label="Reps serie ${j + 1}">
            <button class="check" data-action="toggle-set" data-i="${i}" data-j="${j}" aria-label="Completar serie">✓</button>
          </div>`).join('')}
        </div>
        <div class="row gap">
          <button class="btn ghost sm" data-action="add-set" data-i="${i}">+ Serie</button>
          ${e.sets.length > 1 ? `<button class="btn ghost sm" data-action="del-set" data-i="${i}">− Serie</button>` : ''}
        </div>
      </section>`;
    });

    h += `<div class="stack">
      <button class="btn block" data-action="finish">Terminar y guardar</button>
      <button class="btn ghost block danger" data-action="discard">Descartar entreno</button>
    </div>`;
    return h;
  }

  // Series de aproximación para el primer compuesto de cada músculo con carga suficiente
  function warmup(e, X, i, a) {
    const w = num(e.sets[0]?.w) || e.sugg.weight;
    if (X.type !== 'C' || X.bw || !(w >= 30)) return '';
    const firstOfMuscle = a.exercises.findIndex(o => ex(o.exId).m === X.m) === i;
    if (!firstOfMuscle) return '';
    const step = X.inc >= 2.5 ? 2.5 : 2;
    const bar = (X.name.includes('barra') || X.name.includes('Peso muerto') || X.name.includes('Sentadilla')) ? 20 : 0;
    const plan = [];
    if (bar && w >= 50) plan.push([bar, 10]);
    [[0.5, 6], [0.7, 4], [0.85, 2]].forEach(([pct, r]) => {
      const kg = Math.max(bar, Math.round(w * pct / step) * step);
      if (kg < w && !plan.some(p => p[0] === kg)) plan.push([kg, r]);
    });
    if (!plan.length) return '';
    return `<details class="tip"><summary>Calentamiento</summary><p>${plan.map(([kg, r]) => `${fmt(kg)} kg × ${r}`).join(' → ')}<br><small class="muted">Descansa ~1 min entre ellas. No cuentan como series de trabajo.</small></p></details>`;
  }

  function startSession(dayId) {
    const day = S.routine.days.find(d => d.id === dayId);
    if (!day) return;
    S.active = {
      id: uid(), dayId: day.id, dayName: day.name, start: new Date().toISOString(),
      exercises: day.exercises.map(e => {
        const sugg = Calc.suggest(e, Store.historyFor(e.exId), ex(e.exId));
        return {
          exId: e.exId,
          target: { sets: e.sets, repMin: e.repMin, repMax: e.repMax, rest: e.rest },
          sugg,
          sets: Array.from({ length: e.sets }, () => ({ w: sugg.weight ?? '', r: '', done: false })),
        };
      }),
    };
    Store.saveActive();
    go('train');
  }

  async function finishSession() {
    const a = S.active;
    const exercises = a.exercises.map(e => ({
      exId: e.exId,
      sets: e.sets.filter(s => s.done && num(s.r) > 0).map(s => ({ w: num(s.w) || 0, r: num(s.r) })),
    })).filter(e => e.sets.length);
    if (!exercises.length) return toast('Marca al menos una serie con ✓ antes de terminar.');

    // récords (1RM estimado) antes de guardar
    const prs = [];
    exercises.forEach(e => {
      const prevBest = Math.max(0, ...Store.historyFor(e.exId).flatMap(h => h.sets.map(s => Calc.e1rm(s.w, s.r))));
      const best = Math.max(...e.sets.map(s => Calc.e1rm(s.w, s.r)));
      if (prevBest > 0 && best > prevBest) prs.push(ex(e.exId).name);
    });

    const session = {
      id: a.id, date: a.start, dayId: a.dayId, dayName: a.dayName,
      durationMin: Math.max(1, Math.round((Date.now() - new Date(a.start)) / 60000)),
      exercises,
    };
    await Store.addSession(session);
    S.active = null;
    await Store.saveActive();
    stopRest();
    Native.success();
    const sets = exercises.reduce((n, e) => n + e.sets.length, 0);
    const vol = exercises.reduce((n, e) => n + e.sets.reduce((m, s) => m + s.w * s.r, 0), 0);
    toast(`💪 Entreno guardado: ${sets} series · ${fmtInt(vol)} kg${prs.length ? `<br>🏆 Récord en ${prs.map(esc).join(', ')}` : ''}`, 4500);
    go('home');
  }

  // ---------- temporizador de descanso ----------
  let restTimer = null, restEnd = 0, restName = '';
  function startRest(sec, name = '') {
    restEnd = Date.now() + sec * 1000;
    restName = name;
    Native.scheduleRest(sec, name);
    $('#rest').classList.add('show');
    clearInterval(restTimer);
    tickRest();
    restTimer = setInterval(tickRest, 250);
  }
  function tickRest() {
    const left = Math.ceil((restEnd - Date.now()) / 1000);
    const el = $('#rest');
    if (left <= 0) {
      clearInterval(restTimer);
      el.innerHTML = '<span>⏱️ ¡A por la siguiente serie!</span>';
      Native.success();
      setTimeout(() => $('#rest').classList.remove('show'), 2500);
      return;
    }
    el.innerHTML = `<span>Descanso <b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b></span>
      <span class="row gap"><button class="btn ghost sm" data-action="rest-add">+15 s</button><button class="btn ghost sm" data-action="rest-skip">Saltar</button></span>`;
  }
  function stopRest() { clearInterval(restTimer); Native.cancelRest(); $('#rest').classList.remove('show'); }

  // =====================================================================
  // PROGRESO
  // =====================================================================
  function viewProgress() {
    const mode = ui.progMode;
    const cur = Calc.summarize(S.sessions, Calc.range(mode, 0));
    const prev = Calc.summarize(S.sessions, Calc.range(mode, -1));
    const label = Calc.periodLabel(mode, Calc.range(mode, 0));
    let h = `<div class="segmented">
      <button class="${mode === 'week' ? 'on' : ''}" data-action="prog-mode" data-mode="week">Semanal</button>
      <button class="${mode === 'month' ? 'on' : ''}" data-action="prog-mode" data-mode="month">Mensual</button>
    </div>`;

    h += `<section class="card">
      <span class="kicker">${mode === 'week' ? 'Semana' : 'Mes'} · ${label}</span>
      <div class="stats">
        <div><b>${cur.sessions}</b><span>entrenos ${delta(cur.sessions, prev.sessions)}</span></div>
        <div><b>${cur.sets}</b><span>series ${delta(cur.sets, prev.sets)}</span></div>
        <div><b>${fmtInt(cur.volume)}</b><span>kg vol. ${delta(cur.volume, prev.volume)}</span></div>
      </div>
      <p class="small muted">Comparado con ${mode === 'week' ? 'la semana' : 'el mes'} anterior.</p>
    </section>`;

    // plan de cargas para los próximos entrenos
    if (S.routine && S.sessions.length) {
      h += `<details class="card plan" ${ui.planOpen ? 'open' : ''} data-toggle="planOpen"><summary class="row between"><span class="kicker">Plan de cargas · próximos entrenos</span><span class="small muted">ver ›</span></summary>
        ${S.routine.days.map(d => `<div class="plan-day"><h3>${esc(d.name)}</h3><ul class="next-list">${d.exercises.map(e => {
          const X = ex(e.exId);
          const sg = Calc.suggest(e, Store.historyFor(e.exId), X);
          return `<li><span class="sg sg-${sg.kind}">${SUGG_ICON[sg.kind]}</span><span class="grow">${esc(X.name)}<small class="muted">${sg.weight != null ? esc(Calc.fmtW(sg.weight, X)) + ' · ' : ''}${e.sets} × ${e.repMin}–${e.repMax}</small></span></li>`;
        }).join('')}</ul></div>`).join('')}
        <p class="small muted">▲ subir peso · ＝ mantener y sumar reps · ▼ bajar y reconstruir · ★ sin datos aún</p>
      </details>`;
    }

    // series por periodo (últimos 8)
    const items = [];
    for (let k = -7; k <= 0; k++) {
      const r = Calc.range(mode, k);
      const s = Calc.summarize(S.sessions, r);
      items.push({
        value: s.sets,
        label: mode === 'week' ? r[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric' }) : r[0].toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
      });
    }
    h += `<section class="card"><span class="kicker">Series por ${mode === 'week' ? 'semana' : 'mes'}</span>${Charts.bars(items)}</section>`;

    // fuerza por ejercicio
    const ids = Object.keys(cur.best);
    if (ids.length) {
      h += `<section class="card"><span class="kicker">Fuerza (1RM estimado)</span>
        <table class="tbl"><thead><tr><th>Ejercicio</th><th>Ahora</th><th>Antes</th><th></th></tr></thead><tbody>
        ${ids.map(id => `<tr><td>${esc(ex(id).name)}</td><td>${fmt(Calc.round(cur.best[id], 1))}</td><td class="muted">${prev.best[id] ? fmt(Calc.round(prev.best[id], 1)) : '–'}</td><td>${delta(cur.best[id], prev.best[id])}</td></tr>`).join('')}
        </tbody></table>
        <p class="small muted">1RM estimado = peso que podrías levantar 1 vez, calculado con tus series (fórmula de Epley). Sirve para comparar aunque cambies de reps.</p>
      </section>`;
    }

    // detalle de un ejercicio
    const trained = [...new Set(S.sessions.flatMap(s => s.exercises.map(e => e.exId)))];
    if (trained.length) {
      if (!ui.progEx || !trained.includes(ui.progEx)) ui.progEx = trained[0];
      const hist = Store.historyFor(ui.progEx).reverse();
      const pts = hist.map(hh => ({ x: new Date(hh.date), y: Calc.round(Math.max(...hh.sets.map(s => Calc.e1rm(s.w, s.r))), 1) }));
      h += `<section class="card"><span class="kicker">Evolución por ejercicio</span>
        <select data-change="prog-ex">${trained.map(id => `<option value="${id}" ${id === ui.progEx ? 'selected' : ''}>${esc(ex(id).name)}</option>`).join('')}</select>
        ${Charts.line(pts, { unit: 'kg' })}
        <ul class="hist">${hist.slice(-5).reverse().map(hh => `<li><span>${fmtDate(hh.date)}</span><span>${hh.sets.map(s => (s.w ? fmt(s.w) + '×' : '') + s.r).join(' · ')}</span></li>`).join('')}</ul>
      </section>`;
    }

    // peso corporal
    const bwPts = S.bodyweights.map(b => ({ x: new Date(b.date), y: b.kg }));
    h += `<section class="card"><span class="kicker">Peso corporal</span>
      <div class="row gap"><input type="text" inputmode="decimal" id="bw-input" placeholder="Peso de hoy (kg)"><button class="btn" data-action="add-bw">Añadir</button></div>
      ${Charts.line(bwPts, { unit: 'kg' })}
      ${S.bodyweights.length ? `<ul class="hist">${S.bodyweights.slice(-5).reverse().map(b => `<li><span>${fmtDate(b.date)}</span><span>${fmt(b.kg)} kg <button class="x" data-action="del-bw" data-id="${b.id}" aria-label="Borrar">✕</button></span></li>`).join('')}</ul>` : ''}
    </section>`;

    // medidas y % de grasa
    const fem = S.profile.sex === 'f';
    const bfPts = S.measures.map(m => {
      const bf = Calc.navyBodyFat({ sex: S.profile.sex, heightCm: S.profile.heightCm, waistCm: m.waistCm, neckCm: m.neckCm, hipCm: m.hipCm });
      return bf ? { x: new Date(m.date), y: Calc.round(bf, 1), m } : null;
    }).filter(Boolean);
    if (SHOW_MEASURES) h += `<section class="card"><span class="kicker">Medidas y % de grasa</span>
      <div class="grid${fem ? '3' : '2'}">
        <span class="inp"><input type="text" inputmode="decimal" id="m-waist" placeholder="Cintura" value=""><em>cm</em></span>
        <span class="inp"><input type="text" inputmode="decimal" id="m-neck" placeholder="Cuello" value=""><em>cm</em></span>
        ${fem ? '<span class="inp"><input type="text" inputmode="decimal" id="m-hip" placeholder="Cadera"><em>cm</em></span>' : ''}
      </div>
      <button class="btn block" data-action="add-measure">Guardar medidas</button>
      ${S.profile.heightCm ? Charts.line(bfPts, { unit: '%' }) : '<p class="small muted">Pon tu altura en el perfil para calcular el % de grasa.</p>'}
      ${S.measures.length ? `<ul class="hist">${S.measures.slice(-5).reverse().map(m => {
        const pt = bfPts.find(p => p.m === m);
        return `<li><span>${fmtDate(m.date)}</span><span>${fmt(m.waistCm)} / ${fmt(m.neckCm)}${m.hipCm ? ' / ' + fmt(m.hipCm) : ''} cm${pt ? ` · <b>${fmt(pt.y)} %</b>` : ''} <button class="x" data-action="del-measure" data-id="${m.id}" aria-label="Borrar">✕</button></span></li>`;
      }).join('')}</ul>` : '<p class="small muted">Mídete cada 2–4 semanas, en ayunas y a la misma hora. Cintura a la altura del ombligo, cuello justo debajo de la nuez.</p>'}
    </section>`;

    // historial
    if (S.sessions.length) {
      h += `<details class="card"><summary class="kicker">Historial de entrenos (${S.sessions.length})</summary>
        <ul class="hist">${S.sessions.slice(-20).reverse().map(s => `<li><span>${fmtDate(s.date)} · <b>${esc(s.dayName)}</b><br><small class="muted">${s.exercises.reduce((n, e) => n + e.sets.length, 0)} series · ${s.durationMin || '?'} min</small></span>
          <button class="x" data-action="del-session" data-id="${s.id}" aria-label="Borrar">✕</button></li>`).join('')}</ul>
      </details>`;
    }
    if (!S.sessions.length) h += `<p class="muted small pad">Cuando registres entrenos verás aquí tu evolución semanal y mensual.</p>`;
    return h;
  }

  // =====================================================================
  // PERFIL Y NUTRICIÓN
  // =====================================================================
  function field(key, label, unit, ph = '') {
    return `<label class="field"><span>${label}</span><span class="inp"><input type="text" inputmode="decimal" data-profile="${key}" value="${S.profile[key] ?? ''}" placeholder="${ph}">${unit ? `<em>${unit}</em>` : ''}</span></label>`;
  }

  function viewNutrition() {
    const seg = `<div class="segmented">
      <button class="${ui.nutMode === 'day' ? 'on' : ''}" data-action="nut-mode" data-mode="day">Diario</button>
      <button class="${ui.nutMode === 'profile' ? 'on' : ''}" data-action="nut-mode" data-mode="profile">Perfil y objetivos</button>
    </div>`;
    return seg + (ui.nutMode === 'day' ? viewDiary() : viewProfile());
  }

  // ---------- diario de comidas ----------
  function macroBar(label, cls, cur, goal, unit = 'g') {
    const pct = goal ? Math.min(100, cur / goal * 100) : 0;
    const over = goal && cur > goal * 1.05;
    return `<div class="mbar ${cls} ${over ? 'over' : ''}"><div class="row between small"><span>${label}</span><span><b>${fmtInt(cur)}</b>${goal ? ` / ${fmtInt(goal)} ${unit}` : ` ${unit}`}</span></div>
      <div class="track"><i style="width:${pct}%"></i></div></div>`;
  }

  function viewDiary() {
    const today = Store.dayKey();
    if (!ui.day) ui.day = today;
    const n = nutri(S.profile);
    const t = Store.dayTotals(ui.day);
    const d = new Date(ui.day + 'T12:00');
    const label = ui.day === today ? 'Hoy' : ui.day === Store.dayKey(Date.now() - 864e5) ? 'Ayer' : '';
    let h = `<div class="daynav">
      <button class="x" data-action="day-shift" data-v="-1" aria-label="Día anterior">‹</button>
      <div><b>${label || d.toLocaleDateString('es-ES', { weekday: 'long' })}</b><small class="muted">${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</small></div>
      <button class="x" data-action="day-shift" data-v="1" aria-label="Día siguiente" ${ui.day >= today ? 'disabled' : ''}>›</button>
    </div>`;

    const left = n ? n.kcal - t.k : null;
    h += `<section class="card accent">
      <div class="row between"><span class="kicker">Calorías</span>${n ? `<span class="small ${left < 0 ? 'c-high' : 'muted'}">${left >= 0 ? `Te quedan <b>${fmtInt(left)}</b> kcal` : `Te has pasado <b>${fmtInt(-left)}</b> kcal`}</span>` : ''}</div>
      ${macroBar('Energía', 'm-kcal', t.k, n?.kcal, 'kcal')}
      ${macroBar('Proteína', 'm-prot', t.p, n?.protein)}
      ${macroBar('Carbohidratos', 'm-carb', t.c, n?.carbs)}
      ${macroBar('Grasas', 'm-fat', t.f, n?.fat)}
      ${n ? '' : '<p class="small muted">Completa tu perfil para ver tus objetivos. <button class="link" data-action="nut-mode" data-mode="profile">Ir al perfil ›</button></p>'}
    </section>`;

    const yesterday = Store.dayKey(new Date(ui.day + 'T12:00').getTime() - 864e5);
    if (!Store.foodsOn(ui.day).length && Store.foodsOn(yesterday).length) {
      h += `<button class="btn ghost block" style="margin:0 0 12px" data-action="copy-day" data-from="${yesterday}">Copiar las comidas del día anterior</button>`;
    }

    Object.entries(MEALS).forEach(([key, name]) => {
      const list = Store.foodsOn(ui.day).filter(e => e.meal === key);
      const kcal = list.reduce((a, e) => a + e.k, 0);
      const open = ui.addMeal === key;
      h += `<section class="card meal">
        <div class="row between"><h3>${name}</h3>
          <span class="row gap"><span class="small muted">${kcal ? fmtInt(kcal) + ' kcal' : ''}</span>
          <button class="btn sm ${open ? 'ghost' : ''}" data-action="meal-add" data-meal="${key}">${open ? 'Cerrar' : '+ Añadir'}</button></span>
        </div>
        ${list.length ? `<ul class="food-list">${list.map(e => `<li><span class="grow">${esc(e.name)}<small class="muted">${e.grams ? fmt(e.grams) + ' g · ' : ''}P ${fmt(e.p)} · C ${fmt(e.c)} · G ${fmt(e.f)}</small></span>
          <b>${fmtInt(e.k)}</b><button class="x" data-action="food-del" data-id="${e.id}" aria-label="Quitar">✕</button></li>`).join('')}</ul>` : ''}
        ${open ? addPanel(key) : ''}
      </section>`;
    });
    h += `<p class="small muted pad">Valores nutricionales aproximados. Para más precisión crea tus alimentos con los datos de la etiqueta.</p>`;
    return h;
  }

  function foodResults() {
    const q = norm(ui.q.trim());
    let list;
    if (q) {
      list = Store.allFoods().filter(f => norm(f.name).includes(q)).slice(0, 25);
    } else {
      // recientes primero
      const recentIds = [...new Set([...S.foodlog].reverse().map(e => e.foodId).filter(Boolean))].slice(0, 8);
      const recent = recentIds.map(Store.foodById).filter(Boolean);
      list = [...recent, ...Store.allFoods().filter(f => !recentIds.includes(f.id))].slice(0, 25);
    }
    if (!list.length) return `<p class="small muted">Sin resultados. Puedes crear el alimento o usar la entrada rápida.</p>`;
    return list.map(f => `<button class="food-opt ${ui.pick === f.id ? 'on' : ''}" data-action="pick-food" data-id="${f.id}">
      <span class="grow">${esc(f.name)}<small class="muted">${f.k} kcal · P ${fmt(f.p)} · C ${fmt(f.c)} · G ${fmt(f.f)} /100 g</small></span>
      ${f.custom ? '<span class="pill ok">mío</span>' : ''}</button>`).join('');
  }

  function foodPreview(f, g) {
    if (!f || !(g > 0)) return '';
    const r = g / 100;
    return `<b>${fmtInt(f.k * r)} kcal</b> · P ${fmt(Calc.round(f.p * r, 1))} · C ${fmt(Calc.round(f.c * r, 1))} · G ${fmt(Calc.round(f.f * r, 1))}`;
  }

  function addPanel(meal) {
    if (ui.panel === 'quick') {
      return `<div class="addpanel">
        <p class="kicker">Entrada rápida</p>
        <input type="text" id="q-name" placeholder="Nombre (opcional)">
        <div class="grid4"><input type="text" inputmode="numeric" id="q-k" placeholder="kcal"><input type="text" inputmode="decimal" id="q-p" placeholder="Prot"><input type="text" inputmode="decimal" id="q-c" placeholder="Carb"><input type="text" inputmode="decimal" id="q-f" placeholder="Grasa"></div>
        <div class="row gap"><button class="btn" data-action="quick-save" data-meal="${meal}">Añadir</button><button class="link" data-action="panel" data-v="">← Buscar alimento</button></div>
      </div>`;
    }
    if (ui.panel === 'create') {
      return `<div class="addpanel">
        <p class="kicker">Nuevo alimento (por 100 g, mira la etiqueta)</p>
        <input type="text" id="c-name" placeholder="Nombre, p. ej. Pan de molde Bimbo">
        <div class="grid4"><input type="text" inputmode="numeric" id="c-k" placeholder="kcal"><input type="text" inputmode="decimal" id="c-p" placeholder="Prot"><input type="text" inputmode="decimal" id="c-c" placeholder="Carb"><input type="text" inputmode="decimal" id="c-f" placeholder="Grasa"></div>
        <div class="grid2"><input type="text" id="c-un" placeholder="Unidad (opcional): rebanada"><input type="text" inputmode="decimal" id="c-ug" placeholder="Gramos por unidad"></div>
        <div class="row gap"><button class="btn" data-action="create-save" data-meal="${meal}">Guardar alimento</button><button class="link" data-action="panel" data-v="">← Buscar alimento</button></div>
      </div>`;
    }
    const f = ui.pick ? Store.foodById(ui.pick) : null;
    const g0 = f ? (f.u ? f.u[1] : 100) : 100;
    return `<div class="addpanel">
      <input type="search" id="food-q" placeholder="Buscar alimento…" value="${esc(ui.q)}" autocomplete="off">
      ${f ? `<div class="picked">
        <div class="row between"><b>${esc(f.name)}</b><button class="x" data-action="pick-food" data-id="" aria-label="Quitar">✕</button></div>
        <div class="row gap">
          <span class="inp grow"><input type="text" inputmode="decimal" id="food-g" value="${g0}"><em>g</em></span>
          ${f.u ? `<button class="btn ghost sm" data-action="set-grams" data-g="${f.u[1]}">1 ${esc(f.u[0])}</button><button class="btn ghost sm" data-action="set-grams" data-g="${f.u[1] * 2}">2</button>` : `<button class="btn ghost sm" data-action="set-grams" data-g="100">100 g</button>`}
        </div>
        <p class="small" id="food-prev">${foodPreview(f, g0)}</p>
        <button class="btn block" data-action="food-save" data-meal="${meal}">Añadir a ${MEALS[meal].toLowerCase()}</button>
        ${f.custom ? `<button class="link danger small" data-action="custom-del" data-id="${f.id}">Borrar este alimento de «mis alimentos»</button>` : ''}
      </div>` : ''}
      <div id="food-results" class="food-results">${foodResults()}</div>
      <div class="row gap wrap"><button class="link" data-action="panel" data-v="quick">⚡ Entrada rápida (solo kcal)</button><button class="link" data-action="panel" data-v="create">＋ Crear alimento</button></div>
    </div>`;
  }

  function viewProfile() {
    const p = S.profile;
    let h = `<section class="card">
      <span class="kicker">Tus datos</span>
      <label class="field"><span>Nombre</span><span class="inp"><input type="text" data-profile="name" value="${esc(p.name)}" placeholder="Opcional"></span></label>
      <div class="segmented">
        <button class="${p.sex === 'm' ? 'on' : ''}" data-action="sex" data-v="m">Hombre</button>
        <button class="${p.sex === 'f' ? 'on' : ''}" data-action="sex" data-v="f">Mujer</button>
      </div>
      <div class="grid2">
        ${field('age', 'Edad', 'años', '25')}
        ${field('heightCm', 'Altura', 'cm', '175')}
        ${field('kg', 'Peso', 'kg', '75')}
        ${SHOW_MEASURES ? field('waistCm', 'Cintura', 'cm', 'a la altura del ombligo') : ''}
        ${SHOW_MEASURES ? field('neckCm', 'Cuello', 'cm', 'bajo la nuez') : ''}
        ${SHOW_MEASURES && p.sex === 'f' ? field('hipCm', 'Cadera', 'cm', 'parte más ancha') : ''}
      </div>
      <label class="field"><span>Actividad</span><select data-profile="activity">
        ${Object.entries(Calc.ACTIVITY).map(([k, a]) => `<option value="${k}" ${p.activity === k ? 'selected' : ''}>${a.name} — ${a.desc}</option>`).join('')}
      </select></label>
      <label class="field"><span>Objetivo</span><select data-profile="goal">
        ${Object.entries(Calc.GOALS).map(([k, g]) => `<option value="${k}" ${p.goal === k ? 'selected' : ''}>${g.name} — ${g.desc}</option>`).join('')}
      </select></label>
    </section>`;

    const n = nutri(p);
    if (!n) return h + `<p class="muted small pad">Rellena edad, altura y peso para ver tus calorías y macros.</p>`;

    h += `<section class="card accent">
      <span class="kicker">Objetivo diario · ${Calc.GOALS[p.goal].name}</span>
      <div class="kcal"><b>${fmtInt(n.kcal)}</b> kcal</div>
      <div class="macro-bar"><i class="m-prot" style="width:${n.pct.protein}%"></i><i class="m-carb" style="width:${n.pct.carbs}%"></i><i class="m-fat" style="width:${n.pct.fat}%"></i></div>
      <div class="macros">
        <div class="m-prot"><b>${n.protein} g</b><span>Proteína · ${n.pct.protein} %</span></div>
        <div class="m-carb"><b>${n.carbs} g</b><span>Carbos · ${n.pct.carbs} %</span></div>
        <div class="m-fat"><b>${n.fat} g</b><span>Grasas · ${n.pct.fat} %</span></div>
      </div>
      <p class="small muted">Proteína ${Calc.GOALS[p.goal].prot} g por kg · grasas ~25 % · el resto, carbohidratos.</p>
    </section>`;

    h += `<section class="card">
      <span class="kicker">Composición corporal</span>
      <div class="stats">
        <div><b>${fmt(n.bf)} %</b><span>grasa corporal</span></div>
        <div><b>${fmt(n.lbm)}</b><span>kg masa magra</span></div>
        <div><b>${fmt(n.bmi)}</b><span>IMC · ${Calc.bmiLabel(n.bmi)}</span></div>
      </div>
      <p class="small muted">% grasa: ${n.bfMethod}.</p>
    </section>
    <section class="card">
      <span class="kicker">Gasto energético</span>
      <ul class="kv">
        <li><span>Metabolismo basal (Mifflin-St Jeor)</span><b>${fmtInt(n.bmr)} kcal</b></li>
        <li><span>Mantenimiento (con actividad)</span><b>${fmtInt(n.tdee)} kcal</b></li>
        <li><span>Objetivo (${Calc.GOALS[p.goal].name.toLowerCase()})</span><b>${fmtInt(n.kcal)} kcal</b></li>
      </ul>
    </section>`;

    // Ajuste según la evolución del peso
    const adv = weightAdvice();
    if (adv) h += `<section class="card"><span class="kicker">Seguimiento del peso</span><p>${adv}</p></section>`;

    h += `<p class="small muted pad">Son estimaciones orientativas. Lo que manda es cómo evoluciona tu peso: revísalo cada 2–3 semanas y ajusta.</p>`;
    return h;
  }

  function weightAdvice() {
    const now = Date.now();
    const recent = S.bodyweights.filter(b => now - new Date(b.date) <= 21 * 864e5);
    if (recent.length < 2) return S.bodyweights.length ? 'Registra tu peso varias veces por semana (en ayunas) y aquí verás si vas al ritmo adecuado.' : null;
    const first = recent[0], last = recent[recent.length - 1];
    const days = (new Date(last.date) - new Date(first.date)) / 864e5;
    if (days < 7) return `Llevas ${Math.round(days)} días de registros. Con 1 semana o más te diré si vas al ritmo adecuado.`;
    const rate = (last.kg - first.kg) / days * 7;
    const pct = rate / first.kg * 100;
    const g = S.profile.goal;
    const r = `Ritmo actual: <b>${rate > 0 ? '+' : ''}${fmt(Calc.round(rate, 2))} kg/semana</b> (${fmt(Calc.round(pct, 2))} %). `;
    if (g === 'cut') {
      if (pct > -0.3) return r + 'Bajas más lento de lo ideal (0,5–1 %/semana). Prueba a quitar ~150 kcal/día.';
      if (pct < -1.1) return r + 'Bajas muy rápido y puedes perder músculo. Añade ~150 kcal/día.';
      return r + 'Vas al ritmo ideal para perder grasa. ¡Sigue así!';
    }
    if (g === 'bulk') {
      if (pct < 0.15) return r + 'Subes poco. Añade ~150 kcal/día.';
      if (pct > 0.6) return r + 'Subes muy rápido (más grasa de la necesaria). Quita ~150 kcal/día.';
      return r + 'Buen ritmo para ganar músculo con poca grasa.';
    }
    if (Math.abs(pct) > 0.3) return r + `Tu peso se está ${pct > 0 ? 'subiendo' : 'bajando'}. Ajusta ~150 kcal/día si quieres mantenerte.`;
    return r + 'Peso estable: estás en mantenimiento.';
  }

  // =====================================================================
  // RUTINA (generador por volumen + editor)
  // =====================================================================
  function viewRoutine() {
    const p = S.profile;
    let h = `<section class="card">
      <span class="kicker">Generar rutina por volumen</span>
      <p class="small muted">La app calcula cuántas series semanales necesita cada músculo según tu nivel y objetivo, y las reparte en tus días.</p>
      <label class="field"><span>Nivel</span><select data-profile="level">
        ${Object.entries(LEVELS).map(([k, l]) => `<option value="${k}" ${p.level === k ? 'selected' : ''}>${l.name} — ${l.desc}</option>`).join('')}
      </select></label>
      <label class="field"><span>Días por semana</span>
        <div class="segmented days">${[2, 3, 4, 5, 6].map(d => `<button class="${+p.days === d ? 'on' : ''}" data-action="days" data-v="${d}">${d}</button>`).join('')}</div>
        <small class="muted">${SPLITS[p.days]?.name || ''}</small>
      </label>
      <label class="field"><span>Objetivo</span><select data-profile="goal">
        ${Object.entries(Calc.GOALS).map(([k, g]) => `<option value="${k}" ${p.goal === k ? 'selected' : ''}>${g.name}</option>`).join('')}
      </select></label>
      <button class="btn block" data-action="generate">${S.routine ? 'Regenerar rutina' : 'Generar rutina'}</button>
    </section>`;

    if (!S.routine) return h;
    const R = S.routine;
    const level = R.generated?.level || p.level;
    const vol = Calc.weeklyVolume(R, level);
    const maxV = Math.max(...vol.map(v => Math.max(v.total, v.max))) * 1.05;

    h += `<section class="card">
      <div class="row between"><span class="kicker">Volumen semanal · ${LEVELS[level]?.name || ''}</span><span class="small muted">series/semana</span></div>
      <ul class="vol">${vol.map(v => `<li class="vol-${v.status}">
        <span class="vn">${v.name}</span>
        <span class="vt"><i class="zone" style="left:${v.min / maxV * 100}%;width:${(v.max - v.min) / maxV * 100}%"></i><i class="fill" style="width:${v.total / maxV * 100}%"></i></span>
        <span class="vv">${fmt(v.total)}<small>/${v.min}–${v.max}</small></span>
      </li>`).join('')}</ul>
      <p class="small muted">Zona sombreada = rango recomendado. Cuenta series directas + ½ de las indirectas (p. ej. el press banca suma algo de tríceps). <span class="c-low">■</span> bajo <span class="c-ok">■</span> ok <span class="c-high">■</span> alto</p>
      ${(R.notes || []).map(t => `<p class="note">ℹ️ ${esc(t)}</p>`).join('')}
    </section>`;

    R.days.forEach((d, di) => {
      const total = d.exercises.reduce((a, e) => a + (+e.sets || 0), 0);
      h += `<section class="card rday">
        <div class="row between gap"><input class="day-name" type="text" data-day-name="${di}" value="${esc(d.name)}" aria-label="Nombre del día">
        <span class="small muted nowrap">${total} series</span></div>
        ${d.exercises.map((e, ei) => {
          const X = ex(e.exId);
          const same = Object.keys(EXERCISES).filter(id => EXERCISES[id].m === X.m);
          return `<div class="rex">
            <select data-change="swap" data-d="${di}" data-e="${ei}" aria-label="Ejercicio">${same.map(id => `<option value="${id}" ${id === e.exId ? 'selected' : ''}>${esc(EXERCISES[id].name)}</option>`).join('')}</select>
            <label class="mini">Series <input type="text" inputmode="numeric" data-rex="sets" data-d="${di}" data-e="${ei}" value="${e.sets}" aria-label="Series"></label>
            <label class="mini">Reps <span class="reps"><input type="text" inputmode="numeric" data-rex="repMin" data-d="${di}" data-e="${ei}" value="${e.repMin}" aria-label="Reps mínimas">–<input type="text" inputmode="numeric" data-rex="repMax" data-d="${di}" data-e="${ei}" value="${e.repMax}" aria-label="Reps máximas"></span></label>
            <span class="row"><button class="x" data-action="ex-up" data-d="${di}" data-e="${ei}" aria-label="Subir" ${ei === 0 ? 'disabled' : ''}>↑</button><button class="x" data-action="ex-del" data-d="${di}" data-e="${ei}" aria-label="Quitar">✕</button></span>
          </div>`;
        }).join('')}
        <select class="add-ex" data-change="add-ex" data-d="${di}">
          <option value="">+ Añadir ejercicio…</option>
          ${MUSCLE_ORDER.map(m => `<optgroup label="${MUSCLES[m].name}">${Object.keys(EXERCISES).filter(id => EXERCISES[id].m === m).map(id => `<option value="${id}">${esc(EXERCISES[id].name)}</option>`).join('')}</optgroup>`).join('')}
        </select>
        ${R.days.length > 1 ? `<button class="link danger small" data-action="day-del" data-d="${di}">Eliminar día</button>` : ''}
      </section>`;
    });
    h += `<button class="btn ghost block" data-action="day-add">+ Añadir día</button>`;
    return h;
  }

  // =====================================================================
  // AJUSTES
  // =====================================================================
  function viewSettings() {
    return `<section class="card">
      <span class="kicker">Tus datos</span>
      <p class="small">Todo se guarda en la base de datos interna del móvil (${DB.mode === 'idb' ? 'IndexedDB' : 'almacenamiento local de respaldo'}). No se envía nada a ningún servidor.</p>
      <ul class="kv">
        <li><span>Entrenos registrados</span><b>${S.sessions.length}</b></li>
        <li><span>Registros de peso</span><b>${S.bodyweights.length}</b></li>
      </ul>
      <div class="stack">
        <button class="btn ghost block" data-action="export">Exportar copia de seguridad</button>
        <label class="btn ghost block">Importar copia<input type="file" accept="application/json,.json" id="import-file" hidden></label>
        <button class="btn ghost block danger" data-action="reset">Borrar todos los datos</button>
      </div>
    </section>
    <section class="card">
      <span class="kicker">Instalar en el móvil</span>
      <p class="small"><b>iPhone (Safari):</b> botón Compartir → «Añadir a pantalla de inicio».<br>
      <b>Android (Chrome):</b> menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».</p>
    </section>
    <p class="small muted pad">Mfit · beta 0.3</p>`;
  }

  const VIEWS = { home: viewHome, train: viewTrain, progress: viewProgress, nutrition: viewNutrition, routine: viewRoutine, settings: viewSettings };

  // =====================================================================
  // ACCIONES
  // =====================================================================
  const routineDay = el => S.routine.days[+el.dataset.d];

  const actions = {
    go: el => go(el.dataset.to),
    'quick-diary': () => { ui.nutMode = 'day'; ui.day = Store.dayKey(); go('nutrition'); },
    start: el => {
      if (S.active && !confirm('Ya tienes un entreno en curso. ¿Descartarlo y empezar otro?')) return;
      startSession(el.dataset.day);
    },
    'toggle-set': el => {
      const e = S.active.exercises[+el.dataset.i];
      const s = e.sets[+el.dataset.j];
      s.done = !s.done;
      if (s.done) {
        if (s.r === '' || s.r == null) s.r = e.target.repMax;
        if (s.w === '' || s.w == null) s.w = e.sugg.weight ?? 0;
        Native.tap();
        startRest(e.target.rest, ex(e.exId).name);
      }
      Store.saveActive();
      render();
    },
    'add-set': el => {
      const e = S.active.exercises[+el.dataset.i];
      const last = e.sets[e.sets.length - 1];
      e.sets.push({ w: last ? last.w : '', r: '', done: false });
      Store.saveActive(); render();
    },
    'del-set': el => {
      const e = S.active.exercises[+el.dataset.i];
      e.sets.pop(); Store.saveActive(); render();
    },
    finish: () => finishSession(),
    discard: async () => {
      if (!confirm('¿Descartar este entreno? No se guardará nada.')) return;
      S.active = null; await Store.saveActive(); stopRest(); go('home');
    },
    'rest-add': () => { restEnd += 15000; Native.scheduleRest(Math.ceil((restEnd - Date.now()) / 1000), restName); tickRest(); },
    'rest-skip': () => stopRest(),

    'prog-mode': el => { ui.progMode = el.dataset.mode; render(); },
    'add-bw': async () => {
      const v = num($('#bw-input').value);
      if (!v || v < 25 || v > 350) return toast('Introduce un peso válido en kg.');
      await Store.addBodyweight(v);
      toast('Peso registrado ✓'); render();
    },
    'del-bw': async el => { if (confirm('¿Borrar este registro de peso?')) { await Store.deleteBodyweight(el.dataset.id); render(); } },
    'del-session': async el => { if (confirm('¿Borrar este entreno del historial?')) { await Store.deleteSession(el.dataset.id); render(); } },

    sex: el => { S.profile.sex = el.dataset.v; Store.saveProfile(); render(); },
    days: el => { S.profile.days = +el.dataset.v; Store.saveProfile(); render(); },
    generate: async () => {
      if (S.routine && !confirm('Se sustituirá tu rutina actual (tu historial de entrenos se mantiene). ¿Continuar?')) return;
      S.routine = Calc.generate({ level: S.profile.level, days: S.profile.days, goal: S.profile.goal });
      await Store.saveRoutine();
      toast('Rutina generada ✓'); render();
    },
    'ex-del': el => { routineDay(el).exercises.splice(+el.dataset.e, 1); Store.saveRoutine(); render(); },
    'ex-up': el => {
      const list = routineDay(el).exercises, i = +el.dataset.e;
      if (i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      Store.saveRoutine(); render();
    },
    'day-add': () => {
      S.routine.days.push({ id: uid(), name: `Día ${S.routine.days.length + 1}`, exercises: [] });
      Store.saveRoutine(); render();
    },
    'day-del': el => {
      const d = routineDay(el);
      if (!confirm(`¿Eliminar «${d.name}» de la rutina?`)) return;
      S.routine.days.splice(+el.dataset.d, 1); Store.saveRoutine(); render();
    },

    'nut-mode': el => { ui.nutMode = el.dataset.mode; render(); },
    'day-shift': el => {
      const d = new Date(ui.day + 'T12:00'); d.setDate(d.getDate() + +el.dataset.v);
      const k = Store.dayKey(d);
      if (k > Store.dayKey()) return;
      ui.day = k; ui.addMeal = null; render();
    },
    'copy-day': async el => { const n = await Store.copyDay(el.dataset.from, ui.day); toast(`${n} alimentos copiados ✓`); render(); },
    'meal-add': el => {
      const m = el.dataset.meal;
      ui.addMeal = ui.addMeal === m ? null : m; ui.pick = null; ui.q = ''; ui.panel = null;
      render();
      if (ui.addMeal) setTimeout(() => $('#food-q')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
    },
    'food-del': async el => { await Store.deleteFoodEntry(el.dataset.id); render(); },
    'pick-food': el => { ui.pick = el.dataset.id || null; render(); if (ui.pick) setTimeout(() => $('#food-g')?.select(), 30); },
    'set-grams': el => { $('#food-g').value = el.dataset.g; updatePreview(); },
    panel: el => { ui.panel = el.dataset.v || null; render(); },
    'food-save': async el => {
      const f = Store.foodById(ui.pick);
      const g = num($('#food-g').value);
      if (!f || !(g > 0)) return toast('Indica los gramos.');
      await Store.logFood({ day: ui.day, meal: el.dataset.meal, food: f, grams: g });
      ui.pick = null; ui.q = ''; ui.addMeal = null;
      toast(`${esc(f.name)} añadido ✓`); render();
    },
    'quick-save': async el => {
      const k = num($('#q-k').value);
      if (!(k > 0)) return toast('Pon al menos las kcal.');
      await Store.logQuick({ day: ui.day, meal: el.dataset.meal, name: $('#q-name').value.trim(), k: Math.round(k), p: num($('#q-p').value) || 0, c: num($('#q-c').value) || 0, f: num($('#q-f').value) || 0 });
      ui.panel = null; ui.addMeal = null; toast('Añadido ✓'); render();
    },
    'create-save': async () => {
      const name = $('#c-name').value.trim();
      const k = num($('#c-k').value);
      if (!name || k == null) return toast('Pon al menos el nombre y las kcal por 100 g.');
      const food = { name, k, p: num($('#c-p').value) || 0, c: num($('#c-c').value) || 0, f: num($('#c-f').value) || 0 };
      const un = $('#c-un').value.trim(), ug = num($('#c-ug').value);
      if (un && ug > 0) food.u = [un, ug];
      const f = await Store.addCustomFood(food);
      ui.panel = null; ui.pick = f.id; toast('Alimento guardado ✓'); render();
    },
    'custom-del': async el => {
      if (!confirm('¿Borrar este alimento de tu lista? (lo ya apuntado en el diario se mantiene)')) return;
      await Store.deleteCustomFood(el.dataset.id); ui.pick = null; render();
    },
    'add-measure': async () => {
      const m = { waistCm: num($('#m-waist').value), neckCm: num($('#m-neck').value), hipCm: $('#m-hip') ? num($('#m-hip').value) : null };
      if (!m.waistCm || !m.neckCm) return toast('Pon al menos cintura y cuello.');
      await Store.addMeasure(m); toast('Medidas guardadas ✓'); render();
    },
    'del-measure': async el => { if (confirm('¿Borrar estas medidas?')) { await Store.deleteMeasure(el.dataset.id); render(); } },

    export: () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `mfit-copia-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    reset: async () => {
      if (!confirm('Se borrarán perfil, rutina, entrenos y pesos. ¿Seguro?')) return;
      await Store.resetAll(); toast('Datos borrados'); go('home');
    },
  };

  const changeActions = {
    'prog-ex': el => { ui.progEx = el.value; render(); },
    swap: el => { routineDay(el).exercises[+el.dataset.e].exId = el.value; const X = ex(el.value); Object.assign(routineDay(el).exercises[+el.dataset.e], { repMin: X.reps[0], repMax: X.reps[1], rest: X.rest }); Store.saveRoutine(); render(); },
    'add-ex': el => {
      if (!el.value) return;
      const X = ex(el.value);
      routineDay(el).exercises.push({ exId: el.value, sets: 3, repMin: X.reps[0], repMax: X.reps[1], rest: X.rest });
      Store.saveRoutine(); render();
    },
  };

  // ---------- eventos (delegación) ----------
  document.addEventListener('click', e => {
    const tabBtn = e.target.closest('.tabbar button, #btn-settings');
    if (tabBtn) return go(tabBtn.dataset.tab);
    const el = e.target.closest('[data-action]');
    if (el && actions[el.dataset.action]) { e.preventDefault(); actions[el.dataset.action](el, e); }
  });

  function updatePreview() {
    const f = Store.foodById(ui.pick);
    const prev = $('#food-prev');
    if (prev) prev.innerHTML = foodPreview(f, num($('#food-g')?.value));
  }

  let saveT = null;
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'food-q') { ui.q = el.value; const r = $('#food-results'); if (r) r.innerHTML = foodResults(); return; }
    if (el.id === 'food-g') return updatePreview();
    if (el.dataset.set && S.active) {
      const s = S.active.exercises[+el.dataset.i].sets[+el.dataset.j];
      s[el.dataset.set] = el.value.replace(',', '.');
      clearTimeout(saveT); saveT = setTimeout(Store.saveActive, 400);
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.change && changeActions[el.dataset.change]) return changeActions[el.dataset.change](el);
    if (el.dataset.profile) {
      const k = el.dataset.profile;
      const textKeys = ['name', 'activity', 'goal', 'level'];
      S.profile[k] = textKeys.includes(k) ? el.value : num(el.value);
      Store.saveProfile(); render();
      return;
    }
    if (el.dataset.rex) {
      const r = routineDay(el).exercises[+el.dataset.e];
      const v = Math.round(num(el.value) || 0);
      r[el.dataset.rex] = Math.max(el.dataset.rex === 'sets' ? 1 : 1, Math.min(50, v || 1));
      if (r.repMin > r.repMax) [r.repMin, r.repMax] = [r.repMax, r.repMin];
      Store.saveRoutine(); render();
      return;
    }
    if (el.dataset.dayName != null) {
      S.routine.days[+el.dataset.dayName].name = el.value.trim() || 'Día';
      Store.saveRoutine();
      return;
    }
    if (el.id === 'import-file' && el.files[0]) {
      el.files[0].text().then(async t => {
        try { await Store.importJSON(t); toast('Copia importada ✓'); go('home'); }
        catch (err) { toast('No se pudo importar: ' + esc(err.message)); }
      });
    }
  });

  // recordar si un desplegable está abierto entre renders
  document.addEventListener('toggle', e => { if (e.target.dataset && e.target.dataset.toggle) ui[e.target.dataset.toggle] = e.target.open; }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'bw-input') actions['add-bw']();
    if (e.key === 'Enter' && e.target.id === 'food-g') actions['food-save']($('[data-action=food-save]'));
  });

  // ---------- arranque ----------
  async function boot() {
    Native.init();
    try {
      await Store.init();
    } catch (err) {
      console.error(err);
      view.innerHTML = `<section class="card"><h2>Error al abrir la base de datos</h2><p class="muted small">${esc(err.message)}</p></section>`;
      return;
    }
    render();
    // refrescar el contador de minutos del entreno
    setInterval(() => { if (ui.tab === 'train' && S.active && !document.activeElement?.matches('input')) render(); }, 60000);
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  boot();
})();
