import { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldCheck, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApprovalsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState({ className: '', subject: '', term: '', status: 'submitted' });
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const fetchResults = () => {
    const params = new URLSearchParams();
    if (filters.className) params.append('className', filters.className);
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.term) params.append('term', filters.term);
    if (filters.status) params.append('status', filters.status);
    api.get(`/results?${params}`).then(res => { setResults(res.data.results || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchResults();
    api.get('/classes').then(r => setClasses(r.data.classes || []));
    api.get('/subjects').then(r => setSubjects(r.data.subjects || []));
  }, [filters]);

  useEffect(() => { fetchResults(); }, [filters]);

  const verifySelected = async () => {
    if (selected.length === 0) return;
    try {
      await api.put('/results/verify', { ids: selected });
      toast.success(`Verified ${selected.length} results`);
      setSelected([]);
      fetchResults();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const unverifySelected = async () => {
    if (selected.length === 0) return;
    try {
      await api.put('/results/unverify', { ids: selected });
      toast.success(`Unverified ${selected.length} results`);
      setSelected([]);
      fetchResults();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => { if (selected.length === results.length) setSelected([]); else setSelected(results.map(r => r._id)); };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { draft: 'badge-warning', submitted: 'badge-info', verified: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', published: 'badge-success', hidden: 'badge-gray', locked: 'badge-danger' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Result Approvals</h1>
          <p className="text-sm text-gray-500">Review and verify submitted results before admin publication</p>
        </div>
        <div className="flex gap-2">
          <button onClick={verifySelected} disabled={selected.length === 0} className="btn-success text-sm"><ShieldCheck size={16} /> Verify ({selected.length})</button>
          <button onClick={unverifySelected} disabled={selected.length === 0} className="btn-outline text-sm"><XCircle size={16} /> Unverify</button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filters.className} onChange={e => setFilters({ ...filters, className: e.target.value })} className="input-field w-auto">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filters.subject} onChange={e => setFilters({ ...filters, subject: e.target.value })} className="input-field w-auto">
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={filters.term} onChange={e => setFilters({ ...filters, term: e.target.value })} className="input-field w-auto">
          <option value="">All Terms</option>
          <option>Term 1</option><option>Term 2</option><option>Term 3</option>
        </select>
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="verified">Verified</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 w-10"><input type="checkbox" onChange={selectAll} checked={selected.length === results.length && results.length > 0} /></th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Term%</th>
                <th className="px-4 py-3">Exam%</th>
                <th className="px-4 py-3">Final</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Teacher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse">{[...Array(11)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>)}</tr>)
              ) : results.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-500">No results found</td></tr>
              ) : (
                results.map(r => (
                  <tr key={r._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${r.status === 'verified' ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggleSelect(r._id)} /></td>
                    <td className="px-4 py-3 text-sm">{r.student?.firstName} {r.student?.lastName}</td>
                    <td className="px-4 py-3 text-sm">{r.className?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{r.subject?.name}</td>
                    <td className="px-4 py-3 text-sm">{r.term}</td>
                    <td className="px-4 py-3 text-sm">{r.termMark}</td>
                    <td className="px-4 py-3 text-sm">{r.examMark}</td>
                    <td className="px-4 py-3 text-sm font-bold">{r.finalMark}</td>
                    <td className="px-4 py-3"><span className="badge badge-info">{r.grade || '-'}</span></td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.teacher?.firstName} {r.teacher?.lastName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
