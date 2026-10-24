export function setupClassesListeners(navigate) {
  const container = document.getElementById("classes-cards-grid");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const journalBtn = e.target.closest('[data-action="open-journal"]');
    if (journalBtn) {
      e.preventDefault();
      const classId = journalBtn.getAttribute("data-class-id");
      const subjectId = journalBtn.getAttribute("data-subject-id");
      if (navigate && classId && subjectId) {
        navigate(`/journal?class=${encodeURIComponent(classId)}&subject=${encodeURIComponent(subjectId)}`);
      }
      return;
    }

    const scheduleBtn = e.target.closest('[data-action="open-schedule"]');
    if (scheduleBtn) {
      e.preventDefault();
      const classId = scheduleBtn.getAttribute("data-class-id");
      if (navigate && classId) {
        navigate(`/schedule?class=${encodeURIComponent(classId)}`);
      }
    }
  });
}
