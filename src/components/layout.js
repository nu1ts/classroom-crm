import { renderSidebar, setupSidebarListeners } from './sidebar.js';
import { renderHeader, setupHeaderListeners } from './header.js';

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

      <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        ${renderHeader(currentUser, currentPath)}

        <main id="app-content" class="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div class="max-w-7xl mx-auto">
            ${contentHtml}
          </div>
        </main>
      </div>
    </div>
  `;
}

export function setupLayoutListeners(onNavigate) {
  setupSidebarListeners(onNavigate);
  setupHeaderListeners(onNavigate);
}
