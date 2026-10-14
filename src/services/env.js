const DEV_STORAGE_KEY = 'classroom_crm_dev_mode';

export function isDevMode() {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('dev') === 'true' || searchParams.get('dev') === '1') {
      return true;
    }

    if (window.location.hash.includes('dev=true') || window.location.hash.includes('dev=1')) {
      return true;
    }

    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(DEV_STORAGE_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    }

    return false;
  } catch {
    return false;
  }
}

export function setDevMode(enabled) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DEV_STORAGE_KEY, enabled ? 'true' : 'false');
    }
    window.location.reload();
  } catch (e) {
    console.error('Ошибка сохранения режима разработки', e);
  }
}

if (typeof window !== 'undefined') {
  window.__CRM_DEV__ = {
    enable: () => setDevMode(true),
    disable: () => setDevMode(false),
    toggle: () => setDevMode(!isDevMode()),
    status: () => isDevMode() ? 'DEV MODE (Активен)' : 'PRODUCTION MODE'
  };

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'в' || e.key === 'В')) {
      e.preventDefault();
      const next = !isDevMode();
      setDevMode(next);
    }
  });
}
