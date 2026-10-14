import { getDB, getCurrentUser } from './services/storage.js';
import { router } from './router.js';

getDB();

document.addEventListener('DOMContentLoaded', () => {
  router.init();
});
