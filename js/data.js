/* Mfit · datos base: grupos musculares, biblioteca de ejercicios y volumen recomendado */
'use strict';

// Grupos musculares. big = músculo grande (se programa primero, con ejercicios compuestos)
const MUSCLES = {
  pecho:      { name: 'Pecho',      big: true  },
  espalda:    { name: 'Espalda',    big: true  },
  cuadriceps: { name: 'Cuádriceps', big: true  },
  femoral:    { name: 'Femoral',    big: true  },
  hombros:    { name: 'Hombros',    big: false },
  gluteo:     { name: 'Glúteo',     big: false },
  biceps:     { name: 'Bíceps',     big: false },
  triceps:    { name: 'Tríceps',    big: false },
  gemelos:    { name: 'Gemelos',    big: false },
  abdomen:    { name: 'Abdomen',    big: false },
};
const MUSCLE_ORDER = ['cuadriceps', 'pecho', 'espalda', 'femoral', 'hombros', 'gluteo', 'triceps', 'biceps', 'gemelos', 'abdomen'];

/*
 * Ejercicios.
 *  m   = músculo principal (cuenta 1 serie)
 *  sec = músculos secundarios (cuentan 0,5 series de volumen indirecto)
 *  type: 'C' compuesto | 'I' aislamiento
 *  reps: rango por defecto · rest: descanso en segundos · inc: subida de peso en kg
 *  bw: ejercicio con peso corporal (el peso registrado es lastre)
 */
const EXERCISES = {
  // Pecho
  press_banca:      { name: 'Press banca con barra', m: 'pecho', sec: ['triceps', 'hombros'], type: 'C', reps: [6, 10], rest: 150, inc: 2.5,
    tip: 'Escápulas juntas y hacia abajo, pies firmes en el suelo. Baja la barra controlando hasta la parte baja del pecho con los codos a unos 45–70º del cuerpo y empuja sin despegar los glúteos del banco.' },
  press_inclinado:  { name: 'Press inclinado con mancuernas', m: 'pecho', sec: ['hombros', 'triceps'], type: 'C', reps: [8, 12], rest: 120, inc: 2,
    tip: 'Banco a 30º aprox. Baja las mancuernas abiertas hasta notar estiramiento en el pecho y súbelas juntándolas ligeramente arriba, sin chocarlas.' },
  fondos:           { name: 'Fondos en paralelas', m: 'pecho', sec: ['triceps'], type: 'C', reps: [8, 12], rest: 120, inc: 2.5, bw: true,
    tip: 'Inclina un poco el torso hacia delante para cargar el pecho. Baja hasta que el hombro quede algo por debajo del codo, sin forzar si molesta el hombro.' },
  aperturas_polea:  { name: 'Aperturas en polea', m: 'pecho', sec: [], type: 'I', reps: [12, 15], rest: 60, inc: 1,
    tip: 'Codos ligeramente flexionados y fijos. Abre hasta notar estiramiento y cierra apretando el pecho como si abrazaras un árbol.' },

  // Espalda
  dominadas:        { name: 'Dominadas', m: 'espalda', sec: ['biceps'], type: 'C', reps: [6, 10], rest: 120, inc: 2.5, bw: true,
    tip: 'Agarre algo más ancho que los hombros. Inicia tirando de las escápulas hacia abajo y lleva el pecho a la barra. Baja del todo, controlando.' },
  remo_barra:       { name: 'Remo con barra', m: 'espalda', sec: ['biceps'], type: 'C', reps: [8, 10], rest: 120, inc: 2.5,
    tip: 'Torso inclinado unos 45º con la espalda neutra. Lleva la barra hacia el ombligo con los codos pegados y sin dar tirones con la cadera.' },
  jalon:            { name: 'Jalón al pecho', m: 'espalda', sec: ['biceps'], type: 'C', reps: [10, 12], rest: 90, inc: 2.5,
    tip: 'Pecho alto y ligera inclinación atrás. Baja la barra a la parte alta del pecho pensando en llevar los codos hacia los bolsillos.' },
  remo_polea:       { name: 'Remo en polea baja', m: 'espalda', sec: ['biceps'], type: 'C', reps: [10, 12], rest: 90, inc: 2.5,
    tip: 'Espalda recta, sin balancearte. Tira hacia el abdomen juntando escápulas y deja que se estiren al volver.' },

  // Cuádriceps
  sentadilla:       { name: 'Sentadilla con barra', m: 'cuadriceps', sec: ['gluteo'], type: 'C', reps: [5, 8], rest: 180, inc: 2.5,
    tip: 'Pies a la anchura de hombros, puntas algo abiertas. Coge aire y aprieta el abdomen antes de bajar, rodillas en la dirección de las puntas y baja al menos hasta paralelo con la espalda neutra.' },
  prensa:           { name: 'Prensa de piernas', m: 'cuadriceps', sec: ['gluteo'], type: 'C', reps: [10, 12], rest: 120, inc: 5,
    tip: 'Zona lumbar pegada al respaldo en todo momento. Baja hasta 90º o algo más sin que se despegue la cadera, y no bloquees las rodillas arriba.' },
  zancadas:         { name: 'Sentadilla búlgara', m: 'cuadriceps', sec: ['gluteo'], type: 'C', reps: [8, 10], rest: 90, inc: 2,
    tip: 'Pie trasero apoyado en un banco. Baja en vertical hasta que la rodilla de atrás casi toque el suelo. Las reps son por pierna.' },
  ext_cuadriceps:   { name: 'Extensión de cuádriceps', m: 'cuadriceps', sec: [], type: 'I', reps: [12, 15], rest: 60, inc: 2.5,
    tip: 'Ajusta el respaldo para que la rodilla quede alineada con el eje de la máquina. Sube controlado, aprieta 1 s arriba y baja lento.' },

  // Femoral
  peso_muerto:      { name: 'Peso muerto', m: 'femoral', sec: ['gluteo', 'espalda'], type: 'C', reps: [4, 6], rest: 180, inc: 2.5,
    tip: 'Barra pegada a las espinillas, espalda neutra y dorsales activos. Empuja el suelo con las piernas y bloquea con la cadera, sin hiperextender la espalda arriba.' },
  peso_muerto_rumano: { name: 'Peso muerto rumano', m: 'femoral', sec: ['gluteo'], type: 'C', reps: [8, 10], rest: 150, inc: 2.5,
    tip: 'Rodillas un poco flexionadas y fijas. Lleva la cadera hacia atrás con la barra rozando las piernas hasta notar tirón en el femoral, y sube apretando glúteos.' },
  curl_femoral:     { name: 'Curl femoral', m: 'femoral', sec: [], type: 'I', reps: [10, 12], rest: 75, inc: 2.5,
    tip: 'Cadera pegada al banco o al asiento. Flexiona del todo y baja controlando en 2–3 segundos.' },

  // Hombros
  press_militar:    { name: 'Press militar con barra', m: 'hombros', sec: ['triceps'], type: 'C', reps: [6, 10], rest: 150, inc: 2.5,
    tip: 'De pie, glúteos y abdomen apretados. Empuja la barra en línea recta apartando la cabeza y métela debajo de la barra al final.' },
  elev_laterales:   { name: 'Elevaciones laterales', m: 'hombros', sec: [], type: 'I', reps: [12, 15], rest: 60, inc: 1,
    tip: 'Codos algo flexionados. Sube hasta la altura de los hombros llevando los codos hacia fuera, no las manos, y sin balanceo.' },
  face_pull:        { name: 'Face pull', m: 'hombros', sec: [], type: 'I', reps: [12, 15], rest: 60, inc: 1,
    tip: 'Polea a la altura de la cara con cuerda. Tira hacia la frente separando las manos y rotando hacia fuera; trabaja el deltoides posterior.' },

  // Glúteo
  hip_thrust:       { name: 'Hip thrust', m: 'gluteo', sec: ['femoral'], type: 'C', reps: [8, 12], rest: 120, inc: 5,
    tip: 'Espalda alta apoyada en el banco y barra sobre la cadera. Sube hasta alinear tronco y muslos, mirando al frente y apretando glúteos 1 s.' },
  patada_gluteo:    { name: 'Patada de glúteo en polea', m: 'gluteo', sec: [], type: 'I', reps: [12, 15], rest: 60, inc: 1,
    tip: 'Tronco estable y ligeramente inclinado. Lleva la pierna atrás sin arquear la espalda. Las reps son por pierna.' },

  // Tríceps
  ext_triceps_polea: { name: 'Extensión de tríceps en polea', m: 'triceps', sec: [], type: 'I', reps: [10, 15], rest: 60, inc: 1,
    tip: 'Codos pegados al cuerpo y quietos. Extiende del todo y abre la cuerda abajo.' },
  press_frances:    { name: 'Press francés', m: 'triceps', sec: [], type: 'I', reps: [8, 12], rest: 75, inc: 1,
    tip: 'Con barra Z tumbado. Baja la barra detrás de la cabeza moviendo solo los antebrazos y sube sin abrir los codos.' },

  // Bíceps
  curl_barra:       { name: 'Curl con barra', m: 'biceps', sec: [], type: 'I', reps: [8, 12], rest: 60, inc: 1,
    tip: 'Codos fijos a los lados. Sube sin balancear el tronco y baja controlando hasta extender casi del todo.' },
  curl_martillo:    { name: 'Curl martillo', m: 'biceps', sec: [], type: 'I', reps: [10, 12], rest: 60, inc: 1,
    tip: 'Agarre neutro con las palmas enfrentadas. Alterna o sube a la vez, sin mover los codos.' },
  curl_inclinado:   { name: 'Curl inclinado con mancuernas', m: 'biceps', sec: [], type: 'I', reps: [10, 12], rest: 60, inc: 1,
    tip: 'Banco a 45–60º con los brazos colgando por detrás del cuerpo para estirar el bíceps. Sube sin adelantar los codos.' },

  // Gemelos
  gemelos_pie:      { name: 'Elevación de gemelos de pie', m: 'gemelos', sec: [], type: 'I', reps: [10, 15], rest: 60, inc: 5,
    tip: 'Baja hasta el estiramiento máximo, pausa 1 s, y sube del todo. Sin rebotes.' },
  gemelos_sentado:  { name: 'Gemelos sentado', m: 'gemelos', sec: [], type: 'I', reps: [12, 15], rest: 60, inc: 2.5,
    tip: 'Recorrido completo con pausa abajo. Con la rodilla flexionada se trabaja sobre todo el sóleo.' },

  // Abdomen
  crunch_polea:     { name: 'Crunch en polea', m: 'abdomen', sec: [], type: 'I', reps: [10, 15], rest: 60, inc: 2.5,
    tip: 'De rodillas, flexiona la columna llevando los codos hacia los muslos. La cadera no se mueve.' },
  elev_piernas:     { name: 'Elevación de piernas colgado', m: 'abdomen', sec: [], type: 'I', reps: [10, 15], rest: 60, inc: 0, bw: true,
    tip: 'Colgado de la barra, sube las piernas enrollando la pelvis hacia arriba y evita balancearte.' },
};

/*
 * Volumen semanal recomendado (series efectivas por músculo y semana), según nivel.
 * [mínimo, máximo]. Cuenta series directas + 0,5 × series indirectas.
 * Orientativo a partir de la literatura de hipertrofia (aprox. 10–20 series/semana para grandes grupos).
 */
const VOLUME = {
  principiante: { pecho: [6, 10], espalda: [8, 12], cuadriceps: [6, 10], femoral: [5, 8], hombros: [6, 10], gluteo: [4, 8], biceps: [4, 8], triceps: [4, 8], gemelos: [4, 8], abdomen: [4, 8] },
  intermedio:   { pecho: [10, 16], espalda: [12, 18], cuadriceps: [10, 16], femoral: [8, 12], hombros: [8, 16], gluteo: [6, 12], biceps: [6, 12], triceps: [6, 12], gemelos: [6, 12], abdomen: [6, 12] },
  avanzado:     { pecho: [14, 20], espalda: [16, 22], cuadriceps: [14, 20], femoral: [10, 16], hombros: [12, 20], gluteo: [8, 16], biceps: [10, 16], triceps: [10, 16], gemelos: [10, 16], abdomen: [8, 14] },
};
const LEVELS = {
  principiante: { name: 'Principiante', desc: 'Menos de 1 año entrenando con constancia', cap: 18 },
  intermedio:   { name: 'Intermedio',   desc: '1–3 años entrenando',                         cap: 22 },
  avanzado:     { name: 'Avanzado',     desc: 'Más de 3 años, progresas despacio',             cap: 26 },
};
// cap = máximo de series por sesión para que el entreno no se alargue (aprox. 60–90 min)

// Divisiones según días por semana
const SPLIT_DAYS = {
  full:  { name: 'Full Body', muscles: ['cuadriceps', 'pecho', 'espalda', 'femoral', 'hombros', 'gluteo', 'triceps', 'biceps', 'gemelos', 'abdomen'] },
  torso: { name: 'Torso',     muscles: ['pecho', 'espalda', 'hombros', 'triceps', 'biceps'] },
  pierna:{ name: 'Pierna',    muscles: ['cuadriceps', 'femoral', 'gluteo', 'gemelos', 'abdomen'] },
  push:  { name: 'Empuje',    muscles: ['pecho', 'hombros', 'triceps'] },
  pull:  { name: 'Tirón',     muscles: ['espalda', 'biceps', 'abdomen'] },
  legs:  { name: 'Pierna',    muscles: ['cuadriceps', 'femoral', 'gluteo', 'gemelos'] },
};
const SPLITS = {
  2: { name: 'Full Body 2 días', days: ['full', 'full'] },
  3: { name: 'Full Body 3 días', days: ['full', 'full', 'full'] },
  4: { name: 'Torso / Pierna',   days: ['torso', 'pierna', 'torso', 'pierna'] },
  5: { name: 'Torso / Pierna + PPL', days: ['torso', 'pierna', 'push', 'pull', 'legs'] },
  6: { name: 'Push / Pull / Legs ×2', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
};
