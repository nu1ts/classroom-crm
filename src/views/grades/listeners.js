export function setupGradesListeners(navigate) {
  const periodSelect = document.getElementById("grades-period-select");
  if (periodSelect) {
    periodSelect.addEventListener("change", (e) => {
      const selectedPeriod = e.target.value;
      if (typeof navigate === "function") {
        navigate(`/grades?period=${encodeURIComponent(selectedPeriod)}`);
      }
    });
  }
}
