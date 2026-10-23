import { getDB } from '../../services/storage.js';
import { renderIcon } from '../../components/icons.js';
import { calculateClassAttendance, calculateClassAverage, calculateSubjectAverages, calculateWeeklyAbsences, generateClassReport, getRiskZoneStudents } from '../../mock/calculations.js';

export function setupAnalyticsListeners(onNavigate) {
  const periodSelect = document.getElementById('select-analytics-period');
  const btnGenerateReport = document.getElementById('btn-generate-report');
  const reportContainer = document.getElementById('report-container');
  const btnCloseReport = document.getElementById('btn-close-report');
  const btnPrintReport = document.getElementById('btn-print-report');

  if (periodSelect) {
    periodSelect.addEventListener('change', () => {
      const selectedPeriod = periodSelect.value;
      const isReportOpen = reportContainer && !reportContainer.classList.contains('hidden');
      if (onNavigate) {
        onNavigate(`/analytics?periodId=${selectedPeriod}${isReportOpen ? '&showReport=true' : ''}`);
      }
    });
  }

  if (btnGenerateReport && reportContainer) {
    btnGenerateReport.addEventListener('click', () => {
      reportContainer.classList.remove('hidden');
      reportContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (btnCloseReport && reportContainer) {
    btnCloseReport.addEventListener('click', () => {
      reportContainer.classList.add('hidden');
    });
  }

  if (btnPrintReport) {
    btnPrintReport.addEventListener('click', () => {
      window.print();
    });
  }
}
