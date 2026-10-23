import { useState, useEffect } from 'react';
import api from '../services/api';
import { Award, TrendingUp, BookOpen, AlertTriangle, Filter } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function StudentResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feesStatus, setFeesStatus] = useState<any>(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [termFilter, setTermFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [hiddenMessage, setHiddenMessage] = useState('');

  useEffect(() => {
    api.get('/academic').then(r => setAcademicYears(r.data.years || [])).catch(() => {});
    api.get('/fees/status').then(res => {
      const status = res.data.status;
      setFeesStatus(status);
      if (status && status.canViewResults === false) {
        setHiddenMessage(status.resultsAccessMessage || 'Please contact the school office about your results access.');
        setShowBlocked(true);
        setLoading(false);
      } else {
        loadResults();
      }
    }).catch(() => {
      loadResults();
    });
  }, []);

  const loadResults = () => {
    api.get('/results/student')
      .then(res => {
        setResults(res.data.results || []);
        if (res.data.visible === false) setHiddenMessage(res.data.message || '');
        else setHiddenMessage('');
        setLoading(false);
      })
      .catch(() => { setResults([]); setLoading(false); });
  };

  const filteredResults = results.filter(r => {
    if (termFilter && r.term !== termFilter) return false;
    if (yearFilter && r.academicYear?._id !== yearFilter) return false;
    return true;
  });

  const totalMarks = filteredResults.reduce((sum, r) => sum + (r.finalMark || 0), 0);
  const average = filteredResults.length > 0 ? Math.round((totalMarks / filteredResults.length) * 100) / 100 : 0;

  const chartData = {
    labels: filteredResults.map(r => r.subject?.name || ''),
    datasets: [{
      label: 'Score',
      data: filteredResults.map(r => r.finalMark || 0),
      backgroundColor: filteredResults.map((_, i) => i % 2 === 0 ? 'rgba(185,28,28,0.8)' : 'rgba(30,64,175,0.8)'),
      borderRadius: 6,
    }],
  };

  if (showBlocked) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Results</h1>
      <div className="card max-w-lg mx-auto mt-20 text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={36} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Results Access Restricted</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{hiddenMessage || "Your fees balance currently does not qualify for results access."}</p>
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

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Results</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Results</h1>
        <div className="flex gap-2">
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="input-field w-auto text-sm">
            <option value="">All Years</option>
            {academicYears.map(y => <option key={y._id} value={y._id}>{y.name}</option>)}
          </select>
          <select value={termFilter} onChange={e => setTermFilter(e.target.value)} className="input-field w-auto text-sm">
            <option value="">All Terms</option>
            <option>Term 1</option><option>Term 2</option><option>Term 3</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Subjects</p>
          <p className="text-2xl font-bold">{filteredResults.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="text-2xl font-bold text-mlk-red">{average}%</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Best Subject</p>
          <p className="text-2xl font-bold text-emerald-500">
            {filteredResults.length > 0 ? filteredResults.reduce((best, r) => (r.finalMark || 0) > (best.finalMark || 0) ? r : best, filteredResults[0]).subject?.name : '-'}
          </p>
        </div>
      </div>

      {hiddenMessage && (
        <div className="card border-amber-400 dark:border-amber-600">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={22} />
            <div>
              <p className="font-semibold">Results are currently unavailable</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{hiddenMessage}</p>
            </div>
          </div>
        </div>
      )}

      {filteredResults.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Subject Performance</h3>
          <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />
        </div>
      )}

      <div className="card">
        <h3 className="text-sm font-semibold mb-4">Results Detail ({filteredResults.length} results)</h3>
        {filteredResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen size={40} className="mx-auto mb-3 text-gray-300" />
            <p>No results found. Results will appear here once published by the admin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3">Term Mark</th>
                  <th className="px-4 py-3">Exam Mark</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Final</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Remark</th>
                  <th className="px-4 py-3">Teacher Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredResults.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium">{r.subject?.name}</td>
                    <td className="px-4 py-3 text-sm font-mono">{r.subject?.code}</td>
                    <td className="px-4 py-3 text-sm">{r.term}</td>
                    <td className="px-4 py-3 text-sm">{r.termMark}</td>
                    <td className="px-4 py-3 text-sm">{r.examMark}</td>
                    <td className="px-4 py-3 text-sm">{r.projectMark}</td>
                    <td className="px-4 py-3 text-sm font-bold">{r.finalMark}</td>
                    <td className="px-4 py-3"><span className="badge badge-info">{r.grade || '-'}</span></td>
                    <td className="px-4 py-3 text-sm">{r.gradeRemark || '-'}</td>
                    <td className="px-4 py-3 text-sm">{r.teacherRemark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
