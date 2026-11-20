/* Mfit · funciones nativas (solo dentro de la app de iPhone; en la web no hacen nada) */
'use strict';

const Native = (() => {
  const C = window.Capacitor;
  const isNative = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() && typeof C.registerPlugin === 'function');
  const plug = name => (isNative && C.isPluginAvailable(name) ? C.registerPlugin(name) : null);

  const Haptics = plug('Haptics');
  const Notif = plug('LocalNotifications');
  const StatusBar = plug('StatusBar');
  const REST_ID = 1001;
  const quiet = p => (p && p.catch ? p.catch(() => {}) : p);

  async function init() {
    if (!isNative) return;
    document.documentElement.classList.add('native');
    if (StatusBar) quiet(StatusBar.setStyle({ style: 'DARK' })); // texto claro sobre fondo oscuro
  }

  // Toque corto: al marcar una serie
  function tap() {
    if (Haptics) quiet(Haptics.impact({ style: 'MEDIUM' }));
  }
  // Aviso: fin del descanso, entreno guardado
  function success() {
    if (Haptics) quiet(Haptics.notification({ type: 'SUCCESS' }));
    else if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  async function ensurePermission() {
    if (!Notif) return false;
    try {
      let p = await Notif.checkPermissions();
      if (p.display === 'prompt' || p.display === 'prompt-with-rationale') p = await Notif.requestPermissions();
      return p.display === 'granted';
    } catch (e) { return false; }
  }

  // Notificación al acabar el descanso (llega aunque tengas el móvil bloqueado)
  async function scheduleRest(seconds, exerciseName) {
    if (!Notif || seconds < 5) return;
    if (!(await ensurePermission())) return;
    try {
      await quiet(Notif.cancel({ notifications: [{ id: REST_ID }] }));
      await Notif.schedule({
        notifications: [{
          id: REST_ID,
          title: '⏱️ Descanso terminado',
          body: exerciseName ? `Siguiente serie de ${exerciseName}` : 'A por la siguiente serie 💪',
          schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true },
        }],
      });
    } catch (e) { console.warn('Notificación no programada', e); }
  }
  function cancelRest() {
    if (Notif) quiet(Notif.cancel({ notifications: [{ id: REST_ID }] }));
  }

  return { isNative, init, tap, success, scheduleRest, cancelRest };
})();
