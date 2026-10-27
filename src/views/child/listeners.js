/**
 * Слушатели событий для страницы «Ребёнок»
 */
export function setupChildListeners(navigate) {
  const container = document.getElementById("child-view-container");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const periodBtn = e.target.closest("[data-period-btn]");
    if (periodBtn) {
      const periodId = periodBtn.getAttribute("data-period-btn");
      if (periodId && navigate) {
        navigate(`/child?period=${periodId}`);
      }
    }
  });
}
