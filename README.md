# Mfit · beta 0.2

App móvil (PWA) de rutina de gimnasio, progreso y nutrición. Sin librerías ni compilación: HTML + CSS + JavaScript.

## Cómo probarla

**En el Mac (rápido):** abre `index.html` con Chrome, pulsa `Cmd+Opt+I` → icono de móvil para verla con tamaño de teléfono.

**En el móvil (misma Wi-Fi):**
```bash
cd "~/m3 way/Mfit"
python3 -m http.server 8000
```
Mira la IP del Mac (Ajustes del Sistema → Wi-Fi → Detalles) y abre `http://TU-IP:8000` en el móvil.

**Instalarla como app (con modo sin conexión):** necesita HTTPS. Lo más fácil es subir la carpeta a GitHub Pages
(o a tu VPS) y desde el móvil: iPhone → Compartir → «Añadir a pantalla de inicio»; Android → ⋮ → «Instalar aplicación».

## Qué hace

| Pestaña | Función |
|---|---|
| **Inicio** | Próximo día de la rutina con indicación por ejercicio (▲ subir peso, ＝ mantener, ▼ bajar, ★ primera vez), resumen de la semana, calorías y peso. |
| **Entrenar** | Registro de series (kg × reps), sugerencia de peso, última marca, consejos de técnica y temporizador de descanso y series de calentamiento calculadas para los compuestos. |
| **Progreso** | Plan de cargas para los próximos entrenos (qué subir/mantener/bajar en cada ejercicio), resumen semanal/mensual con comparación con el periodo anterior, series por semana/mes, 1RM estimado por ejercicio, gráfica de evolución, peso corporal, medidas (cintura/cuello/cadera) con gráfica de % de grasa e historial. |
| **Nutrición · Diario** | Apunta comidas por día (desayuno, comida, merienda, cena, snacks) con buscador de ~60 alimentos comunes, tus propios alimentos (datos de la etiqueta) y entrada rápida de kcal. Barras de kcal y macros consumidos frente al objetivo, navegación por días y «copiar día anterior». |
| **Nutrición · Perfil** | Perfil → IMC, % de grasa (método Marina EE. UU. o estimado por IMC), metabolismo basal, mantenimiento, calorías objetivo y macros. Aviso de ajuste según el ritmo de cambio de peso. |
| **Rutina** | Generador por **volumen semanal** (nivel + días + objetivo) y editor (cambiar ejercicio, series, reps, ordenar, añadir días). |
| **Ajustes ⚙** | Exportar/importar copia de seguridad (JSON) y borrar datos. |

## Lógica principal

- **Volumen**: series semanales recomendadas por músculo y nivel en `js/data.js` (`VOLUME`). Cuenta series directas + 0,5 × indirectas.
- **Generador** (`Calc.generate`): elige la división por días (2-3 Full Body, 4 Torso/Pierna, 5 T/P + PPL, 6 PPL×2),
  reparte las series de los músculos grandes, descuenta el volumen indirecto a los pequeños y limita las series por sesión según el nivel (18/22/26).
- **Progresión** (`Calc.suggest`): doble progresión. Todas las series al tope del rango → sube peso; por debajo del mínimo 2 sesiones seguidas → baja un 10 %.
- **Nutrición**: Mifflin-St Jeor × factor de actividad; definición −20 %, volumen +10 %; proteína 2,2 g/kg (definición) o 1,8 g/kg; grasas ~25 %.

## Datos

Base de datos interna del navegador (**IndexedDB**, `js/db.js`) con almacenes `kv` (perfil, rutina, entreno en curso, alimentos propios), `sessions`, `bodyweights`, `foodlog` y `measures`.
Al actualizar de versión la base de datos se migra sola sin perder datos.
Si IndexedDB no está disponible usa localStorage como respaldo. Nada sale del móvil.

## Estructura

```
index.html            estructura y barra de pestañas
css/styles.css        estilos (tema oscuro, mobile first)
js/data.js            músculos, ejercicios (con técnica), volumen, divisiones
js/foods.js           base de alimentos (por 100 g) y comidas del día
js/db.js              capa de base de datos (IndexedDB)
js/calc.js            nutrición, progresión, generador, estadísticas
js/store.js           estado + persistencia
js/charts.js          gráficas SVG
js/app.js             pantallas y acciones
sw.js                 modo sin conexión (sube VERSION al publicar cambios)
manifest.webmanifest  datos para instalarla como app
```

## Cambios

- **0.2** — Diario de comidas, plan de cargas semanal, calentamiento, medidas y % de grasa. BD v2.
- **0.1** — Primera beta: generador por volumen, registro de entrenos, progresión, progreso, nutrición.
