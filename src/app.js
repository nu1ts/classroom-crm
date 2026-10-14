import { getDB, getCurrentUser } from './services/storage.js';
import { router } from './router.js?v=2';

getDB();

document.addEventListener('focusout', (e) => {
  const el = e.target;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    const type = el.type;
    if (type !== 'file' && type !== 'checkbox' && type !== 'radio' && type !== 'button' && type !== 'submit') {
      if (typeof el.value === 'string' && el.value !== el.value.trim()) {
        el.value = el.value.trim();
      }
    }
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form && form.elements) {
    Array.from(form.elements).forEach((el) => {
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        const type = el.type;
        if (type !== 'file' && type !== 'checkbox' && type !== 'radio' && type !== 'button' && type !== 'submit') {
          if (typeof el.value === 'string' && el.value !== el.value.trim()) {
            el.value = el.value.trim();
          }
        }
      }
    });
  }
}, true);

document.addEventListener('DOMContentLoaded', () => {
  router.init();
});
