import { renderSidebar, setupSidebarListeners, updateSidebarActiveItem } from './sidebar.js?v=5';

export function renderLayout(currentUser, currentPath, contentHtml) {
  if (currentPath === '#/login' || !currentUser) {
    return `
      <div id="auth-layout" class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        ${contentHtml}
      </div>
    `;
  }

  return `
    <div id="main-layout" class="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      ${renderSidebar(currentUser, currentPath)}

      <main id="app-content" class="flex-1 overflow-y-auto p-6 lg:p-8 scrollbar-thin">
        <div class="max-w-7xl mx-auto">
          ${contentHtml}
        </div>
      </main>
    </div>
  `;
}

export function setupLayoutListeners(onNavigate) {
  setupSidebarListeners(onNavigate);
}

export { updateSidebarActiveItem };
