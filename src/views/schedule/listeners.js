export function setupScheduleListeners(navigate) {
  const selectWeek = document.getElementById("select-schedule-week");
  if (selectWeek) {
    selectWeek.addEventListener("change", (e) => {
      const weekId = e.target.value;
      if (navigate) {
        navigate(`schedule?week=${weekId}`);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set("week", weekId);
        window.history.pushState({}, "", url.toString());
        window.dispatchEvent(new Event("popstate"));
      }
    });
  }

  const btnPrev = document.getElementById("btn-prev-week");
  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      const targetWeek = btnPrev.getAttribute("data-week-id");
      if (targetWeek) {
        if (navigate) {
          navigate(`schedule?week=${targetWeek}`);
        } else {
          const url = new URL(window.location.href);
          url.searchParams.set("week", targetWeek);
          window.history.pushState({}, "", url.toString());
          window.dispatchEvent(new Event("popstate"));
        }
      }
    });
  }

  const btnNext = document.getElementById("btn-next-week");
  if (btnNext) {
    btnNext.addEventListener("click", () => {
      const targetWeek = btnNext.getAttribute("data-week-id");
      if (targetWeek) {
        if (navigate) {
          navigate(`schedule?week=${targetWeek}`);
        } else {
          const url = new URL(window.location.href);
          url.searchParams.set("week", targetWeek);
          window.history.pushState({}, "", url.toString());
          window.dispatchEvent(new Event("popstate"));
        }
      }
    });
  }

  const btnCurrent = document.getElementById("btn-current-week");
  if (btnCurrent) {
    btnCurrent.addEventListener("click", () => {
      const targetWeek = btnCurrent.getAttribute("data-week-id") || "w8";
      if (navigate) {
        navigate(`schedule?week=${targetWeek}`);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set("week", targetWeek);
        window.history.pushState({}, "", url.toString());
        window.dispatchEvent(new Event("popstate"));
      }
    });
  }

  const btnEmptyReturn = document.getElementById("btn-empty-return-current");
  if (btnEmptyReturn) {
    btnEmptyReturn.addEventListener("click", () => {
      const targetWeek = btnEmptyReturn.getAttribute("data-week-id") || "w8";
      if (navigate) {
        navigate(`schedule?week=${targetWeek}`);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.set("week", targetWeek);
        window.history.pushState({}, "", url.toString());
        window.dispatchEvent(new Event("popstate"));
      }
    });
  }
}
