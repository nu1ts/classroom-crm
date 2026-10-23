/**
 * Декларация маршрутов приложения
 *
 * Единый реестр страниц: путь → { title, render, setup }.
 * Каждая запись описывает, какая вьюха рендерится по адресу и какие
 * обработчики навешиваются. Параметры URL читаются через getRouteParams().
 *
 * Файл содержит только данные — логика переходов и авторизации живёт
 * в src/router.js (класс Router).
 */

import { getCurrentUser } from "../services/storage.js";
import { getRouteParams } from "../services/navigation.js";
import { renderLoginView, setupLoginListeners } from "../views/login/index.js";
import {
  renderOverviewView,
  setupOverviewListeners,
} from "../views/overview/index.js";
import {
  renderProfileView,
  setupProfileListeners,
} from "../views/profile/index.js";
import { renderForbiddenView } from "../views/forbidden.js";
import { renderPlaceholderView } from "../views/placeholder.js";
import {
  renderAttendanceView,
  setupAttendanceListeners,
} from "../views/attendance/index.js";
import {
  renderJournalView,
  setupJournalListeners,
} from "../views/journal/index.js";
import {
  renderStudentsView,
  setupStudentsListeners,
} from "../views/students/index.js";
import {
  renderStudentSummaryView,
  setupStudentSummaryListeners,
} from "../views/student-summary/index.js";
import {
  renderParentsView,
  setupParentsListeners,
  renderParentSummaryView,
  setupParentSummaryListeners,
} from "../views/parents/index.js";
import {
  renderAnalyticsView,
  setupAnalyticsListeners,
} from "../views/analytics/index.js";
import {
  renderAccountsView,
  setupAccountsListeners,
} from "../views/accounts/index.js";
import {
  renderChangePasswordView,
  setupChangePasswordListeners,
} from "../views/change-password/index.js";
import {
  renderTeachersView,
  setupTeachersListeners,
} from "../views/teachers/index.js";
import {
  renderWorkloadView,
  setupWorkloadListeners,
} from "../views/workload/index.js";
import {
  renderSchoolYearView,
  setupSchoolYearListeners,
} from "../views/school-year/index.js";

export const ROUTE_HANDLERS = {
  "/login": {
    title: "Вход в систему",
    render: () => renderLoginView(),
    setup: (navigate) =>
      setupLoginListeners((user, targetRoute) => navigate(targetRoute)),
  },
  "/overview": {
    title: "Обзор класса",
    render: () => renderOverviewView(),
    setup: (navigate) => setupOverviewListeners(navigate),
  },
  "/students": {
    title: "Ученики",
    render: () => {
      const params = getRouteParams();
      return renderStudentsView({
        periodId: params.get("period") || "q1_2024",
        searchQuery: params.get("search") || "",
        filterAbsencesOnly: params.get("absences") === "true",
        sortBy: params.get("sortBy") || "name",
        sortOrder: params.get("sortOrder") || "asc",
        page: params.get("page") || "1",
        studentModalId: params.get("student") || null,
      });
    },
    setup: (navigate) => setupStudentsListeners(navigate),
  },
  "/student": {
    title: "Сводка ученика",
    render: () => {
      const params = getRouteParams();
      return renderStudentSummaryView({
        studentId: params.get("id") || params.get("student") || "st-23",
        periodId: params.get("period") || "q1_2024",
      });
    },
    setup: (navigate) => setupStudentSummaryListeners(navigate),
  },
  "/student-summary": {
    title: "Сводка ученика",
    render: () => {
      const params = getRouteParams();
      return renderStudentSummaryView({
        studentId: params.get("id") || params.get("student") || "st-23",
        periodId: params.get("period") || "q1_2024",
      });
    },
    setup: (navigate) => setupStudentSummaryListeners(navigate),
  },
  "/journal": {
    title: "Журнал класса",
    render: () => {
      const params = getRouteParams();
      const unconfirmed = params.get("unconfirmed") === "true";
      const absences = params.get("absences") === "true";
      const statusParam =
        params.get("status") ||
        (unconfirmed ? "unconfirmed" : absences ? "absences" : "all");
      return renderJournalView({
        subjectId: params.get("subject") || "all",
        weekId: params.get("week") || "all",
        filterStatus: statusParam,
        filterOnlyAbsences: statusParam === "absences" || unconfirmed,
        filterUnconfirmedOnly: unconfirmed,
        filterOnlyEntries: params.get("onlyEntries") === "true",
        searchQuery: params.get("search") || "",
      });
    },
    setup: (navigate) => setupJournalListeners(navigate),
  },
  "/attendance": {
    title: "Посещаемость",
    render: () => renderAttendanceView(),
    setup: (navigate) => setupAttendanceListeners(navigate),
  },
  "/schedule": {
    title: "Расписание",
    render: () =>
      renderPlaceholderView(
        "Расписание",
        "Расписание уроков и звонков на учебную неделю",
        "/schedule",
      ),
    setup: () => {},
  },
  "/parents": {
    title: "Родители",
    render: () => {
      const params = getRouteParams();
      return renderParentsView({
        searchQuery: params.get("search") || "",
        filterLink: params.get("filter") || "all",
        page: params.get("page") || "1",
      });
    },
    setup: (navigate) => setupParentsListeners(navigate),
  },
  "/parent": {
    title: "Сводка по родителю",
    render: () => {
      const params = getRouteParams();
      return renderParentSummaryView({
        parentId: params.get("id") || params.get("parent") || "pr-23",
      });
    },
    setup: (navigate) => setupParentSummaryListeners(navigate),
  },
  "/parent-summary": {
    title: "Сводка по родителю",
    render: () => {
      const params = getRouteParams();
      return renderParentSummaryView({
        parentId: params.get("id") || params.get("parent") || "pr-23",
      });
    },
    setup: (navigate) => setupParentSummaryListeners(navigate),
  },
  "/meetings": {
    title: "Собрания",
    render: () =>
      renderPlaceholderView(
        "Собрания",
        "Родительские собрания, повестка, протоколы и опросы",
        "/meetings",
      ),
    setup: () => {},
  },
  "/announcements": {
    title: "Объявления",
    render: () =>
      renderPlaceholderView(
        "Объявления",
        "Информационные сообщения и объявления для родителей",
        "/announcements",
      ),
    setup: () => {},
  },
  "/analytics": {
    title: "Аналитика",
    render: () => {
      const params = getRouteParams();
      return renderAnalyticsView({
        periodId: params.get("periodId") || params.get("period") || "q1_2024",
        showReport: params.get("showReport") === "true",
      });
    },
    setup: (navigate) => setupAnalyticsListeners(navigate),
  },
  "/profile": {
    title: "Мой профиль",
    render: () => renderProfileView(),
    setup: (navigate) => setupProfileListeners(navigate),
  },
  "/forbidden": {
    title: "Доступ ограничен",
    render: () => renderForbiddenView(),
    setup: () => {},
  },

  "/classes": {
    title: "Мои классы",
    render: () =>
      renderPlaceholderView(
        "Мои классы",
        "Классы с учебной нагрузкой учителя (7Б, 8А, 9В)",
        "/classes",
      ),
    setup: () => {},
  },

  "/child": {
    title: "Ребёнок",
    render: () =>
      renderPlaceholderView(
        "Ребёнок",
        "Карточка успеваемости и посещаемости ученика (Петрова Анна)",
        "/child",
      ),
    setup: () => {},
  },

  "/grades": {
    title: "Оценки",
    render: () =>
      renderPlaceholderView(
        "Оценки",
        "Текущие оценки и средний балл по четвертям",
        "/grades",
      ),
    setup: () => {},
  },

  "/accounts": {
    title: "Учётные записи",
    render: () => {
      const params = getRouteParams();
      const currentUser = getCurrentUser();
      return renderAccountsView({
        searchQuery: params.get("search") || "",
        filterRole: params.get("role") || "all",
        page: params.get("page") || "1",
        currentUserId: currentUser ? currentUser.id : null,
      });
    },
    setup: (navigate) => setupAccountsListeners(navigate),
  },

  "/change-password": {
    title: "Смена временного пароля",
    render: () => renderChangePasswordView(),
    setup: (navigate) => setupChangePasswordListeners(navigate),
  },
  "/teachers": {
    title: "Учителя",
    render: () => {
      const params = getRouteParams();
      return renderTeachersView({
        searchQuery: params.get("search") || "",
        filterSubject: params.get("subject") || "all",
        filterAccount: params.get("account") || "all",
      });
    },
    setup: (navigate) => setupTeachersListeners(navigate),
  },
  "/directories": {
    title: "Справочники",
    render: () =>
      renderPlaceholderView(
        "Справочники",
        "Справочники предметов, кабинетов и причин отсутствия",
        "/directories",
      ),
    setup: () => {},
  },
  "/workload": {
    title: "Нагрузка",
    render: () => {
      const params = getRouteParams();
      return renderWorkloadView({
        searchQuery: params.get("search") || "",
        filterSubject: params.get("subject") || "all",
        filterClass: params.get("class") || "all",
      });
    },
    setup: () => setupWorkloadListeners(),
  },
  "/school-year": {
    title: "Учебный год",
    render: () => {
      const params = getRouteParams();
      return renderSchoolYearView({
        yearId: params.get("year") || null,
      });
    },
    setup: (navigate) => setupSchoolYearListeners(navigate),
  },
};
