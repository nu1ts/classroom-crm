import { ROLE_NAVIGATION } from "../config/navigation.js";
import { renderIcon } from "./icons.js";
import { getCurrentUser, logout, quickLoginAsRole } from "../services/storage.js";
import { isDevMode } from "../services/env.js";
import { navigate } from "../services/navigation.js";

export function renderSidebar(currentUser, currentPath) {
  if (!currentUser) return "";

  const roleConfig =
    ROLE_NAVIGATION[currentUser.role] || ROLE_NAVIGATION.teacher;
  const items = roleConfig.items || [];

  let roleSubtitle =
    currentUser.className || currentUser.roleLabel || "Пользователь";
  if (currentUser.role === "teacher") {
    roleSubtitle = "Классный руководитель 7Б";
  } else if (currentUser.role === "subject_teacher") {
    roleSubtitle = `${currentUser.subject || "Предметник"} (7Б, 8А, 9В)`;
  } else if (currentUser.role === "parent") {
    roleSubtitle = currentUser.childName || "Родитель 7Б";
  } else if (currentUser.role === "student") {
    roleSubtitle = "Ученик 7Б класса";
  } else if (currentUser.role === "admin") {
    roleSubtitle = "Администратор школы";
  }

  const navHtml = items
    .map((item) => {
      const cleanPath = (currentPath || "").split("?")[0];
      const isStudentDetail =
        item.path === "/students" &&
        (cleanPath === "/student" || cleanPath === "/student-summary");
      const isClassJournal =
        item.path === "/classes" &&
        currentUser?.role === "subject_teacher" &&
        cleanPath === "/journal";
      const isActive =
        cleanPath === item.path ||
        isStudentDetail ||
        isClassJournal ||
        (item.path === roleConfig.defaultRoute &&
          (!cleanPath || cleanPath === "/" || cleanPath === ""));
      const activeClasses = isActive
        ? "bg-brand-sidebarActive text-white shadow-sm"
        : "text-slate-300 hover:text-white hover:bg-brand-sidebarHover";

      return `
      <a href="${item.path}" id="${item.id}"
         class="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${activeClasses}">
        <span class="w-5 h-5 flex-shrink-0 flex items-center justify-center">
          ${renderIcon(item.icon, "w-5 h-5")}
        </span>
        <span class="truncate">${item.title}</span>
      </a>
    `;
    })
    .join("");

  const readOnlyBadge = roleConfig.isReadOnly
    ? `
      <div class="px-3 py-1.5 mt-2 mx-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 text-xs text-center font-medium">
        Только для просмотра
      </div>
    `
    : "";

  const initials = (currentUser.shortName || currentUser.personName || "П")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return `
    <aside id="app-sidebar" class="w-64 bg-brand-sidebar text-white flex flex-col flex-shrink-0 h-screen border-r border-slate-800 select-none">
      <div class="p-5 flex items-center space-x-3 border-b border-slate-800/80">
        ${renderIcon("logo")}
        <div class="overflow-hidden">
          <div class="font-bold text-sm tracking-tight text-white leading-tight truncate">
            Кабинет классного руководителя
          </div>
          <div class="text-xs text-slate-400 truncate mt-0.5" title="${roleSubtitle}">
            ${roleSubtitle}
          </div>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
        ${navHtml}
        ${readOnlyBadge}
      </nav>

      ${(() => {
        if (!isDevMode()) return "";
        const demoRoles = [
          { key: "teacher", name: "Классрук: Смирнова М. В." },
          { key: "subject_teacher", name: "Предметник: Козлов А. П." },
          { key: "parent", name: "Родитель: Петров С. В." },
          { key: "student", name: "Ученик: Петрова А." },
          { key: "admin", name: "Админ: Никитин П. А." },
        ];
        const roleOptionsHtml = demoRoles
          .map(
            (r) => `
          <option value="${r.key}" ${currentUser.role === r.key ? "selected" : ""} class="bg-slate-900 text-white">
            ${r.name}
          </option>
        `,
          )
          .join("");

        return `
          <div class="px-3 pt-2 pb-1 border-t border-slate-800/80 bg-slate-900/60">
            <div class="flex items-center justify-between mb-1.5 px-0.5">
              <span class="text-[10px] font-bold text-sky-400 uppercase tracking-wider">DEV режим</span>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <select id="demo-role-switcher"
                    class="w-full text-xs font-medium text-slate-200 bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-500 cursor-pointer">
              ${roleOptionsHtml}
            </select>
          </div>
        `;
      })()}

      <div class="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <div class="flex items-center justify-between p-2 rounded-xl hover:bg-brand-sidebarHover/80 transition-colors">
          <a href="/profile" id="sidebar-profile-link" data-profile-card class="flex items-center space-x-3 overflow-hidden flex-1 group ${currentUser.role === 'subject_teacher' || currentUser.role === 'parent' || currentUser.role === 'student' ? 'nav-profile-alias' : ''}">
            ${currentUser.role === 'subject_teacher' || currentUser.role === 'parent' || currentUser.role === 'student' ? '<span id="nav-profile" class="sr-only">Профиль</span>' : ''}
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-sky-500 flex items-center justify-center text-white font-semibold text-xs shadow-inner flex-shrink-0">
              ${initials}
            </div>
            <div class="overflow-hidden">
              <div class="text-xs font-semibold text-white truncate group-hover:text-brand-300 transition-colors">
                ${currentUser.shortName || currentUser.personName}
              </div>
              <div class="text-[11px] text-slate-400 truncate">
                ${currentUser.roleLabel || "Профиль"}
              </div>
            </div>
          </a>
          <button id="btn-sidebar-logout" title="Выйти из системы"
                  class="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1">
            ${renderIcon("logout", "w-4 h-4")}
          </button>
        </div>
      </div>
    </aside>
  `;
}

export function setupSidebarListeners(onNavigate) {
  const nav = document.getElementById("app-sidebar");
  if (nav) {
    nav.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="/"]');
      if (link) {
        e.preventDefault();
        navigate(link.getAttribute("href"));
      }
    });
  }
  const logoutBtn = document.getElementById("btn-sidebar-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Вы действительно хотите выйти из системы?")) {
        logout();
        navigate("/login");
      }
    });
  }

  const roleSwitcher = document.getElementById("demo-role-switcher");
  if (roleSwitcher) {
    roleSwitcher.addEventListener("change", (e) => {
      const targetRole = e.target.value;
      const user = quickLoginAsRole(targetRole);
      if (user) {
        const defRoute =
          ROLE_NAVIGATION[user.role]?.defaultRoute || "/overview";
        navigate(defRoute);
        if (onNavigate) onNavigate(defRoute);
      }
    });
  }
}

export function updateSidebarActiveItem(currentPath) {
  const sidebar = document.getElementById("app-sidebar");
  if (!sidebar) return;

  const currentUser = getCurrentUser();
  const cleanPath = (currentPath || "").split("?")[0];
  const links = sidebar.querySelectorAll("nav a[href]");
  links.forEach((link) => {
    const href = link.getAttribute("href");
    const isStudentDetail =
      href === "/students" &&
      (cleanPath === "/student" || cleanPath === "/student-summary");
    const isClassJournal =
      href === "/classes" &&
      currentUser?.role === "subject_teacher" &&
      cleanPath === "/journal";
    const isActive =
      href === cleanPath ||
      isStudentDetail ||
      isClassJournal ||
      (href === "/overview" &&
        (!cleanPath || cleanPath === "/" || cleanPath === ""));
    if (isActive) {
      link.classList.remove(
        "text-slate-300",
        "hover:text-white",
        "hover:bg-brand-sidebarHover",
      );
      link.classList.add("bg-brand-sidebarActive", "text-white", "shadow-sm");
    } else {
      link.classList.remove(
        "bg-brand-sidebarActive",
        "text-white",
        "shadow-sm",
      );
      link.classList.add(
        "text-slate-300",
        "hover:text-white",
        "hover:bg-brand-sidebarHover",
      );
    }
  });
}
