import { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Download, Users, BookOpen, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [reportType, setReportType] = useState<'class' | 'subject' | 'top'>('class');

  useEffect(() => {
    api.get('/classes').then(r => setClasses(r.data.classes));
    api.get('/subjects').then(r => setSubjects(r.data.subjects));
  }, []);

  const generateReport = async () => {
    try {
      if (reportType === 'class' && selectedClass) {
        const res = await api.get(`/reports/class?className=${selectedClass}`);
        setReportData(res.data.report);
      } else if (reportType === 'subject' && selectedSubject) {
        const res = await api.get(`/reports/subject?subject=${selectedSubject}`);
        setReportData(res.data.report);
      } else if (reportType === 'top') {
        const res = await api.get('/reports/top-students?limit=10');
        setReportData({ topStudents: res.data.students });
      }
    } catch (err: any) { toast.error('Failed to generate report'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>

      <div className="flex gap-3">
        <button onClick={() => setReportType('class')} className={`btn-outline ${reportType === 'class' ? 'bg-mlk-blue text-white' : ''}`}><Users size={16} /> Class Report</button>
        <button onClick={() => setReportType('subject')} className={`btn-outline ${reportType === 'subject' ? 'bg-mlk-blue text-white' : ''}`}><BookOpen size={16} /> Subject Report</button>
        <button onClick={() => setReportType('top')} className={`btn-outline ${reportType === 'top' ? 'bg-mlk-blue text-white' : ''}`}><BarChart3 size={16} /> Top Students</button>
      </div>

      <div className="card">
        <div className="flex items-end gap-4">
          {reportType === 'class' && (
            <div className="flex-1"><label className="label">Class</label><select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select></div>
          )}
          {reportType === 'subject' && (
            <div className="flex-1"><label className="label">Subject</label><select className="input-field" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select></div>
          )}
          <button onClick={generateReport} className="btn-primary"><FileText size={16} /> Generate</button>
        </div>
      </div>

      {reportData && reportType === 'class' && reportData.performance && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Class Performance Report</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Pos</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Adm No.</th>
                  <th className="px-4 py-3">Subjects</th>
                  <th className="px-4 py-3">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reportData.performance.map((p: any) => (
                  <tr key={p.student?._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-bold">{p.position}</td>
                    <td className="px-4 py-3 text-sm">{p.student?.firstName} {p.student?.lastName}</td>
                    <td className="px-4 py-3 text-sm font-mono">{p.student?.admissionNumber}</td>
                    <td className="px-4 py-3 text-sm">{p.count}</td>
                    <td className="px-4 py-3 text-sm font-bold">{p.average}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData && reportType === 'subject' && reportData.results && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Subject Report - Average: {reportData.average}% | Pass Rate: {reportData.passRate}%</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Final Mark</th>
                  <th className="px-4 py-3">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reportData.results.map((r: any) => (
                  <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm">{r.student?.firstName} {r.student?.lastName}</td>
                    <td className="px-4 py-3 text-sm">{r.className?.name}</td>
                    <td className="px-4 py-3 text-sm font-bold">{r.finalMark}</td>
                    <td className="px-4 py-3"><span className="badge badge-info">{r.grade}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData && reportType === 'top' && reportData.topStudents && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top 10 Students</h3>
          <div className="space-y-3">
            {reportData.topStudents.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="w-8 h-8 bg-mlk-red text-white rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-medium">{s._id?.firstName} {s._id?.lastName}</p>
                  <p className="text-xs text-gray-500">{s._id?.admissionNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-mlk-red">{Math.round(s.avgMark)}%</p>
                  <p className="text-xs text-gray-500">{s.totalSubjects} subjects</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
