import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Download, Printer, FileText, CheckSquare, Square, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import ReportCardView from '../components/ReportCardView';
import { downloadBulkReportPdf } from '../utils/reportPdf';

export default function BulkReportsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfReports, setPdfReports] = useState<any[] | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/students?limit=500').then(r => setStudents(r.data.students || []));
    api.get('/classes').then(r => setClasses(r.data.classes || []));
    api.get('/academic').then(r => {
      const years = r.data.years || [];
      setAcademicYears(years);
      const active = years.find((y: any) => y.isActive);
      if (active) setSelectedYear(active._id);
    });
  }, []);

  useEffect(() => {
    if (!pdfReports || pdfReports.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const els = Array.from(document.querySelectorAll<HTMLElement>('.bulk-pdf-card'));
        if (cancelled || els.length === 0) return;
        const clsName = classes.find((c: any) => c._id === selectedClass)?.name || 'AllClasses';
        const yearName = academicYears.find((y: any) => y._id === selectedYear)?.name || selectedYear || 'Year';
        const filename = `ReportCards_${clsName.replace(/\s+/g, '_')}_${yearName}_${selectedTerm.replace(/\s+/g, '_')}.pdf`;
        await downloadBulkReportPdf(els, filename);
        toast.success(`Downloaded ${els.length} report cards (${els.length} pages)`);
      } catch {
        toast.error('Failed to generate PDF');
      } finally {
        if (!cancelled) {
          setPdfReports(null);
          setPdfGenerating(false);
        }
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pdfReports, classes, academicYears, selectedClass, selectedYear, selectedTerm]);

  const filtered = students.filter(s => {
    if (selectedClass && (s.className?._id || s.className) !== selectedClass) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.firstName?.toLowerCase().includes(q) && !s.lastName?.toLowerCase().includes(q) && !s.admissionNumber?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const toggleSelect = (id: string) => setSelectedStudents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => {
    if (selectedStudents.length === filtered.length) setSelectedStudents([]);
    else setSelectedStudents(filtered.map(s => s._id));
  };

  const fetchReports = async () => {
    const res = await api.post('/reports/bulk-download', {
      studentIds: selectedStudents,
      academicYear: selectedYear,
      term: selectedTerm,
    });
    const reports = res.data.reports || [];
    if (reports.length === 0) throw new Error('No reports generated - students may have no published results');
    const yearName = academicYears.find((y: any) => y._id === selectedYear)?.name || selectedYear || '';
    return reports.map((r: any) => ({ ...r, term: selectedTerm, academicYear: yearName }));
  };

  const generateBulkPdf = async () => {
    if (selectedStudents.length === 0) return toast.error('Select students first');
    setPdfGenerating(true);
    try {
      const reports = await fetchReports();
      setPdfReports(reports);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate reports');
      setPdfGenerating(false);
    }
  };

  const printBulkReports = async () => {
    if (selectedStudents.length === 0) return toast.error('Select students first');
    setGenerating(true);
    try {
      const reports = await fetchReports();
      const htmlParts: string[] = [];
      htmlParts.push(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Student Reports</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 0; }
  .report-page { page-break-after: always; padding: 20px 0; }
  .report-page:last-child { page-break-after: auto; }
  .header { text-align: center; border-bottom: 3px solid #B91C1C; padding-bottom: 10px; margin-bottom: 15px; }
  .header h1 { color: #B91C1C; margin: 0; font-size: 18px; }
  .header h2 { color: #1E40AF; margin: 2px 0 0; font-size: 13px; font-weight: normal; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 15px; padding: 8px; background: #f9fafb; border-radius: 6px; font-size: 11px; }
  .info-grid span { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th { background: #B91C1C; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
  tr:nth-child(even) { background: #f9fafb; }
  .summary { background: #f0f9ff; padding: 10px; border-radius: 6px; border-left: 4px solid #1E40AF; margin-bottom: 10px; }
  .summary h3 { color: #1E40AF; margin: 0 0 5px; font-size: 12px; }
  .footer { text-align: center; font-size: 9px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 20px; }
</style></head><body>`);

      for (const report of reports) {
        const s = report.student;
        const att = report.attendance;
        const attPercent = att && att.totalDays && att.daysPresent != null ? Math.round((att.daysPresent / att.totalDays) * 100) + '%' : 'N/A';
        htmlParts.push(`<div class="report-page">
<div class="header"><h1>Martin Luther King Jnr. Family of Schools</h1><h2>Student Report Card</h2></div>
<div class="info-grid">
  <div><span>Name:</span> ${s?.firstName || ''} ${s?.lastName || ''}</div>
  <div><span>Admission No:</span> ${s?.admissionNumber || ''}</div>
  <div><span>Class:</span> ${s?.className?.name || 'N/A'}</div>
  <div><span>Gender:</span> ${s?.gender || 'N/A'}</div>
</div>
<table><thead><tr><th>Subject</th><th>Term Mark</th><th>Exam Mark</th><th>Project</th><th>Grade Mark</th><th>Grade</th><th>Remark</th></tr></thead><tbody>`);

        for (const r of (report.results || [])) {
          htmlParts.push(`<tr><td>${r.subject?.name || '-'}</td><td>${r.termMark}%</td><td>${r.examMark}%</td><td>${r.projectMark}%</td><td><strong>${r.finalMark}%</strong></td><td>${r.grade || '-'}</td><td>${r.teacherRemark || '-'}</td></tr>`);
        }
        htmlParts.push(`</tbody></table>
<p style="font-size:9px;color:#666;margin:-8px 0 10px;">Grade Mark = 80% Exam Mark + 20% Project Mark. Term Mark is recorded for reference only and does not affect the Grade.</p>
<div class="summary"><h3>Summary</h3><p>Average: <strong>${report.average || 0}%</strong>${att ? ` | Attendance: <strong>${att.daysPresent}/${att.totalDays} days (${attPercent})</strong>` : ''}</p></div>
${s?.sports ? `<div class="summary"><h3>Sports / Extra-Curricular</h3><p>${s.sports}</p></div>` : ''}
<div class="footer">Generated on ${new Date().toLocaleDateString()} | Martin Luther King Jnr. Family of Schools - Online Results System</div>
</div>`);
      }

      htmlParts.push('</body></html>');

      const blob = new Blob([htmlParts.join('')], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.onload = () => { win.print(); };
      }
      toast.success(`Prepared ${reports.length} report cards for printing`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate reports');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Report Cards</h1>
          <p className="text-sm text-gray-500">Select students and generate report cards for printing or PDF download</p>
        </div>
        <div className="flex gap-2">
          <button onClick={printBulkReports} disabled={selectedStudents.length === 0 || generating} className="btn-primary bg-slate-600 hover:bg-slate-700">
            {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparing...</> : <><Printer size={16} /> Print Reports</>}
          </button>
          <button onClick={generateBulkPdf} disabled={selectedStudents.length === 0 || pdfGenerating} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
            {pdfGenerating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating PDF...</> : <><Download size={16} /> Download PDF ({selectedStudents.length})</>}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Filter by Class</label>
            <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Academic Year</label>
            <select className="input-field" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              <option value="">Select Year</option>
              {academicYears.map((y: any) => <option key={y._id} value={y._id}>{y.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Term</label>
            <select className="input-field" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
              <option>Term 1</option><option>Term 2</option><option>Term 3</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Search Students</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-9" placeholder="Name or admission number..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">{filtered.length} students | {selectedStudents.length} selected | each student prints on its own page</p>
          <button onClick={selectAll} className="text-sm text-mlk-blue hover:underline">
            {selectedStudents.length === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white dark:bg-gray-900">
              <tr className="table-header">
                <th className="px-4 py-3 w-10">
                  <button onClick={selectAll}>
                    {selectedStudents.length === filtered.length && filtered.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-4 py-3">Admission No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Gender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map(s => (
                <tr key={s._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${selectedStudents.includes(s._id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`} onClick={() => toggleSelect(s._id)}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedStudents.includes(s._id)} onChange={() => toggleSelect(s._id)} onClick={e => e.stopPropagation()} />
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{s.admissionNumber}</td>
                  <td className="px-4 py-3 text-sm font-medium">{s.firstName} {s.lastName}</td>
                  <td className="px-4 py-3 text-sm">{s.className?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{s.gender}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pdfReports && pdfReports.length > 0 && (
        <div style={{ position: 'absolute', left: -9999, top: 0, pointerEvents: 'none' }} aria-hidden="true">
          {pdfReports.map((r, i) => (
            <div key={i} className="bulk-pdf-card" style={{ width: 794, marginBottom: 0 }}>
              <ReportCardView report={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
