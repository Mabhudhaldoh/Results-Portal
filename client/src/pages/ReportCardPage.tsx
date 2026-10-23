import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, Download, Printer, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ReportCardView from '../components/ReportCardView';
import { downloadSingleReportPdf } from '../utils/reportPdf';

export default function ReportCardPage() {
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [feesStatus, setFeesStatus] = useState<any>(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [hiddenMessage, setHiddenMessage] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const canSelectStudent = user?.role === 'admin' || user?.role === 'headmaster';

  useEffect(() => {
    if (!canSelectStudent) return;
    api.get('/students?limit=500').then(r => setStudents(r.data.students || [])).catch(() => {});
  }, [canSelectStudent]);

  const generateReport = async () => {
    if (canSelectStudent && !selectedStudent) return toast.error('Select a student first');
    setLoading(true);
    try {
      const studentIdParam = canSelectStudent ? `?studentId=${selectedStudent}` : '';
      let status = null;
      try {
        const feesRes = await api.get('/fees/status');
        status = feesRes.data.status;
        setFeesStatus(status);
      } catch {}
      if (!canSelectStudent && status && status.canViewResults === false) {
        setHiddenMessage(status.resultsAccessMessage || 'Please contact the school office about your results access.');
        setShowBlocked(true);
        setLoading(false);
        return;
      }
      const res = await api.get(`/reports/student${studentIdParam}`);
      setReport(res.data.report);
    } catch (err) { toast.error('Failed to load report'); }
    setLoading(false);
  };

  const downloadPdf = async () => {
    if (!cardRef.current || !report) return;
    const s = report.student;
    const name = `${s?.firstName || 'Student'}_${s?.lastName || ''}_ReportCard.pdf`.replace(/\s+/g, '_');
    setPdfLoading(true);
    try {
      await downloadSingleReportPdf(cardRef.current, name);
      toast.success('Report card PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); }
    setPdfLoading(false);
  };

  if (showBlocked) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Card</h1>
      </div>
      <div className="card max-w-lg mx-auto mt-20 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={36} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Report Card Access Restricted</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{hiddenMessage || "Your fees balance currently does not qualify for report-card access."}</p>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-sm">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div><p className="text-gray-500">Required</p><p className="font-bold">${feesStatus?.feesRequired || 0}</p></div>
            <div><p className="text-gray-500">Paid</p><p className="font-bold text-emerald-600">${feesStatus?.feesPaid || 0}</p></div>
            <div><p className="text-gray-500">Balance</p><p className="font-bold text-red-600">${feesStatus?.feesBalance || 0}</p></div>
          </div>
          <div className="border-t pt-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Access policy</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Balances below $100 qualify automatically. For balances of $100 or more, Finance approval and a Headmaster override are both required.</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">Please contact the school finance office to settle your fees balance.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 page-header">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Card</h1>
        <button onClick={generateReport} className="btn-primary" disabled={loading || (canSelectStudent && !selectedStudent)}>
          <Award size={18} /> {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {canSelectStudent && (
        <div className="card">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[250px]">
              <label className="label">Select Student</label>
              <select className="input-field" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                <option value="">-- Choose a student --</option>
                {students.map((s: any) => <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-500 pb-3">Generate a final report card PDF for any student. Each student prints on one page.</p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          html, body { margin: 0; padding: 0; width: 100%; height: auto; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          .report-card-print, .report-card-print * { visibility: visible; }
          .report-card-print { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 0; border: 3px solid #1e3a8a !important; box-shadow: none !important; border-radius: 0 !important; break-inside: avoid; page-break-inside: avoid; }
          .report-header { border-radius: 0 !important; }
          .no-print { display: none !important; }
          @page { margin: 8mm; size: A4 portrait; }
        }
      `}</style>

      {report && (
        <div className="max-w-3xl mx-auto space-y-4">
          {report.resultsHidden && (
            <div className="card border-amber-400 dark:border-amber-600">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={22} />
                <div>
                  <p className="font-semibold">Report card temporarily unavailable</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{report.resultsHiddenMessage || 'The results viewing window has closed. Contact the school office.'}</p>
                </div>
              </div>
            </div>
          )}
          <div ref={cardRef}>
            <ReportCardView report={report} />
          </div>
          <div className="flex gap-3 justify-center no-print">
            <button onClick={() => window.print()} className="btn-primary"><Printer size={16} /> Print Report</button>
            <button onClick={downloadPdf} disabled={pdfLoading} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
              <Download size={16} /> {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
