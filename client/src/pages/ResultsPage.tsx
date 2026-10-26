import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Upload, Send, Lock, Unlock, EyeOff, Trash2, Download, Edit2, X, ShieldCheck, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function ResultsPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({ from: '', to: '', indefinite: true });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editResult, setEditResult] = useState<any>(null);
  const [filters, setFilters] = useState({ className: '', subject: '', term: '', status: '' });
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addForm, setAddForm] = useState({
    student: '', subject: '', className: '', academicYear: '', term: 'Term 1',
    termMark: 0, examMark: 0, projectMark: 0, teacherRemark: '',
  });
  const [editForm, setEditForm] = useState({
    termMark: 0, examMark: 0, projectMark: 0, teacherRemark: '',
  });
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadTerm, setUploadTerm] = useState('Term 1');
  const [uploadClass, setUploadClass] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [publisherAccounts, setPublisherAccounts] = useState<any[]>([]);
  const [publisherDelegateIds, setPublisherDelegateIds] = useState<string[]>([]);
  const [savingDelegates, setSavingDelegates] = useState(false);

  const fetchResults = () => {
    const params = new URLSearchParams();
    if (filters.className) params.append('className', filters.className);
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.term) params.append('term', filters.term);
    if (filters.status) params.append('status', filters.status);
    api.get(`/results?${params}`).then(res => { setResults(res.data.results); setLoading(false); });
  };

  useEffect(() => {
    fetchResults();
    api.get('/classes').then(r => setClasses(r.data.classes));
    api.get('/subjects').then(r => {
      const allSubs = r.data.subjects || [];
      if (user?.role === 'teacher') {
        const assignedIds = (user as any).assignedSubjects?.map((s: any) => typeof s === 'string' ? s : s._id) || [];
        setSubjects(allSubs.filter((s: any) => assignedIds.includes(s._id)));
      } else {
        setSubjects(allSubs);
      }
    });
    api.get('/students?limit=500').then(r => setStudents(r.data.students));
    api.get('/academic').then(r => setAcademicYears(r.data.years || []));
  }, [filters]);

  useEffect(() => { fetchResults(); }, [filters]);
  
  useEffect(() => {
    if (user?.role !== 'headmaster') return;
    Promise.all([api.get('/results/publish-delegates/accounts'), api.get('/results/publish-delegates')])
      .then(([accountsRes, delegatesRes]) => {
        setPublisherAccounts(accountsRes.data.accounts || []);
        setPublisherDelegateIds((delegatesRes.data.delegateIds || []).map(String));
      })
      .catch(() => toast.error('Could not load publishing delegation settings'));
  }, [user?.role]);

  const savePublisherDelegates = async () => {
    setSavingDelegates(true);
    try {
      const res = await api.put('/results/publish-delegates', { delegateIds: publisherDelegateIds });
      toast.success(res.data.message || 'Delegated publishers updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update delegated publishers');
    } finally {
      setSavingDelegates(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/results', addForm);
      if (res.data.success === false) { toast.error(res.data.message); return; }
      toast.success('Result added');
      setShowAddModal(false);
      setAddForm({ student: '', subject: '', className: '', academicYear: '', term: 'Term 1', termMark: 0, examMark: 0, projectMark: 0, teacherRemark: '' });
      fetchResults();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const openEdit = (r: any) => {
    setEditResult(r);
    setEditForm({ termMark: r.termMark || 0, examMark: r.examMark || 0, projectMark: r.projectMark || 0, teacherRemark: r.teacherRemark || '' });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editResult) return;
    try {
      const res = await api.put(`/results/${editResult._id}`, editForm);
      if (res.data.result?.locked) { toast.error('Result is locked'); return; }
      toast.success('Result updated');
      setShowEditModal(false); setEditResult(null); fetchResults();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadSubject) return toast.error('Select file and subject');
    try {
      const arrayBuffer = await uploadFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const res = await api.post('/results/upload-excel', {
        file: uint8Array, subject: uploadSubject, term: uploadTerm, className: uploadClass,
      });
      const created = res.data.created || 0;
      const errors = res.data.errors || [];
      if (errors.length > 0) {
        toast(`Uploaded ${created} results (${errors.length} errors)`, { icon: '⚠️' });
      } else {
        toast.success(`Uploaded ${created} results`);
      }
      setShowUploadModal(false); setUploadFile(null); fetchResults();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Upload failed'); }
  };

  const downloadTemplate = () => {
    const headers = ['Admission Number', 'Student Name', 'Term Mark', 'Exam Mark', 'Project Mark', 'Remarks'];
    let rows = students.filter(s => !uploadClass || (s.className?._id || s.className) === uploadClass).map(s => [s.admissionNumber, `${s.firstName} ${s.lastName}`, '', '', '', '']);
    if (rows.length === 0) {
      rows = [
        ['MLK2026001', 'Tendai Muparutsa', '', '', '', ''],
        ['MLK2026002', 'Chiedza Chakanyuka', '', '', '', ''],
      ];
    }
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks Template');
    XLSX.writeFile(wb, `Marks_Upload_Template_${uploadClass ? uploadClass.replace(/\s+/g, '_') : 'All'}.xlsx`);
    toast.success(`Template downloaded with ${rows.length} students`);
  };

  const publishSelected = async () => {
    if (selected.length === 0) return;
    setShowPublishModal(true);
  };

  const nowLocalInput = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const quickDuration = (hours: number) => {
    const end = new Date(Date.now() + hours * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setPublishForm(f => ({ ...f, to: local(end), indefinite: false }));
  };

  const confirmPublish = async () => {
    try {
      const payload: any = { ids: selected };
      if (!publishForm.indefinite) {
        payload.scheduleFrom = publishForm.from ? new Date(publishForm.from).toISOString() : new Date().toISOString();
        payload.hideAfter = publishForm.to ? new Date(publishForm.to).toISOString() : null;
      }
      const response = await api.put('/results/publish', payload);
      toast.success(response.data.message || `Published ${selected.length} verified results`);
      setShowPublishModal(false);
      setSelected([]);
      fetchResults();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not publish results. Verify them first.');
    }
  };
  const deleteBulkSelected = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} selected result(s)? Locked results will be kept.`)) return;
    const res = await api.put('/results/bulk-delete', { ids: selected });
    toast.success(res.data.message || 'Results deleted');
    setSelected([]);
    fetchResults();
  };
  const lockSelected = async () => { if (selected.length === 0) return; await api.put('/results/lock', { ids: selected }); toast.success(`Locked ${selected.length}`); setSelected([]); fetchResults(); };
  const unlockSelected = async () => { if (selected.length === 0) return; await api.put('/results/unlock', { ids: selected }); toast.success(`Unlocked ${selected.length}`); setSelected([]); fetchResults(); };
  const hideSelected = async () => { if (selected.length === 0) return; await api.put('/results/hide', { ids: selected }); toast.success(`Hidden ${selected.length}`); setSelected([]); fetchResults(); };
  const verifySelected = async () => {
    if (selected.length === 0) return;
    try {
      const response = await api.put('/results/verify', { ids: selected });
      toast.success(response.data.message || 'Selected results verified');
      setSelected([]); fetchResults();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Could not verify results'); }
  };
  const unverifySelected = async () => {
    if (selected.length === 0) return;
    try {
      const response = await api.put('/results/unverify', { ids: selected });
      toast.success(response.data.message || 'Selected results returned for review');
      setSelected([]); fetchResults();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Could not unverify results'); }
  };
  const deleteResult = async (id: string) => { if (!confirm('Delete this result?')) return; await api.delete(`/results/${id}`); toast.success('Deleted'); fetchResults(); };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => { if (selected.length === results.length) setSelected([]); else setSelected(results.map(r => r._id)); };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { draft: 'badge-warning', submitted: 'badge-info', verified: 'badge-purple', published: 'badge-success', hidden: 'badge-gray', locked: 'badge-danger' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
  };

  const activeYear = academicYears.find(y => y.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Results ({results.length})</h1>
        <div className="flex gap-2 flex-wrap">
          {user?.role === 'admin' && (
            <>
              <button onClick={deleteBulkSelected} disabled={selected.length === 0} className="btn-danger text-sm"><Trash2 size={16} /> Delete ({selected.length})</button>
              <button onClick={lockSelected} disabled={selected.length === 0} className="btn-outline text-sm"><Lock size={16} /> Lock</button>
              <button onClick={unlockSelected} disabled={selected.length === 0} className="btn-outline text-sm"><Unlock size={16} /> Unlock</button>
              <button onClick={hideSelected} disabled={selected.length === 0} className="btn-outline text-sm"><EyeOff size={16} /> Hide</button>
            </>
          )}
          {user?.role === 'headmaster' && (
            <>
              <button onClick={verifySelected} disabled={selected.length === 0} className="btn-primary text-sm"><ShieldCheck size={16} /> Verify Selected ({selected.length})</button>
              <button onClick={unverifySelected} disabled={selected.length === 0} className="btn-outline text-sm"><EyeOff size={16} /> Return for Review</button>
              <button onClick={publishSelected} disabled={selected.length === 0} className="btn-success text-sm"><Send size={16} /> Publish Verified ({selected.length})</button>
            </>
          )}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <>
              <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm"><Plus size={16} /> Add Result</button>
              <button onClick={() => setShowUploadModal(true)} className="btn-secondary text-sm"><Upload size={16} /> Upload Excel</button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-600 dark:text-blue-300 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900 dark:text-blue-100">
          <p className="font-semibold">Results release workflow</p>
          <p className="mt-1">New marks remain Draft until the Headmaster verifies them. Only the Headmaster can publish verified results to students. Select result rows using the checkboxes, then choose the operation above.</p>
        </div>
      </div>

      {user?.role === 'headmaster' && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div>
            <h2 className="font-semibold text-amber-950 dark:text-amber-100">Delegated Result Publishers</h2>
            <p className="text-sm text-amber-900 dark:text-amber-200 mt-1">Only accounts selected here may publish results on your behalf. Delegation does not allow verification; results must still be verified by you first.</p>
          </div>
          <select multiple value={publisherDelegateIds} onChange={e => setPublisherDelegateIds(Array.from(e.target.selectedOptions, option => option.value))} className="input-field min-h-32 w-full">
            {publisherAccounts.map(account => <option key={account._id} value={String(account._id)}>{account.firstName} {account.lastName} — {account.role}{account.email ? ' (' + account.email + ')' : ''}</option>)}
          </select>
          <p className="text-xs text-amber-800 dark:text-amber-200">Use Ctrl (Windows) or Cmd (Mac) to select multiple accounts. Clear all selections to revoke every delegation.</p>
          <button onClick={savePublisherDelegates} disabled={savingDelegates} className="btn-primary text-sm">{savingDelegates ? 'Saving...' : 'Save Publishing Delegates'}</button>
        </div>
      )}

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
          <option>draft</option><option>submitted</option><option>verified</option><option>published</option><option>hidden</option><option>locked</option>
        </select>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                  {(user?.role === 'admin' || user?.role === 'headmaster') && <th className="px-4 py-3 w-10"><input type="checkbox" onChange={selectAll} checked={selected.length === results.length && results.length > 0} /></th>}
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Term%</th>
                <th className="px-4 py-3">Exam%</th>
                <th className="px-4 py-3">Project%</th>
                <th className="px-4 py-3">Final</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse">{[...Array(12)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>)}</tr>)
              ) : results.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-12 text-center text-gray-500">No results found</td></tr>
              ) : (
                results.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    {(user?.role === 'admin' || user?.role === 'headmaster') && <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggleSelect(r._id)} /></td>}
                    <td className="px-4 py-3 text-sm">{r.student?.firstName} {r.student?.lastName}</td>
                    <td className="px-4 py-3 text-sm">{r.className?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{r.subject?.name}</td>
                    <td className="px-4 py-3 text-sm">{r.term}</td>
                    <td className="px-4 py-3 text-sm">{r.termMark}</td>
                    <td className="px-4 py-3 text-sm">{r.examMark}</td>
                    <td className="px-4 py-3 text-sm">{r.projectMark}</td>
                    <td className="px-4 py-3 text-sm font-bold">{r.finalMark}</td>
                    <td className="px-4 py-3"><span className="badge badge-info">{r.grade || '-'}</span></td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(user?.role === 'admin' || user?.role === 'teacher') && r.status !== 'locked' && <button title="Edit result" onClick={() => openEdit(r)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600"><Edit2 size={16} /></button>}
                        {user?.role === 'admin' && <button title="Delete result" onClick={() => deleteResult(r._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600"><Trash2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Publish Results Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPublishModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Publish {selected.length} Result(s)</h2>
                <button onClick={() => setShowPublishModal(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setPublishForm(f => ({ ...f, indefinite: true }))} className={`flex-1 p-3 rounded-xl border-2 text-left transition ${publishForm.indefinite ? 'border-mlk-red bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <p className="font-semibold text-sm">Keep Published Indefinitely</p>
                    <p className="text-xs text-gray-500">Students can always see these results.</p>
                  </button>
                  <button type="button" onClick={() => setPublishForm(f => ({ ...f, indefinite: false, from: f.from || nowLocalInput() }))} className={`flex-1 p-3 rounded-xl border-2 text-left transition ${!publishForm.indefinite ? 'border-mlk-red bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <p className="font-semibold text-sm">Publish for a Set Time</p>
                    <p className="text-xs text-gray-500">Results auto-disappear when the time expires.</p>
                  </button>
                </div>

                {!publishForm.indefinite && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Available From</label>
                        <input type="datetime-local" className="input-field" value={publishForm.from} onChange={e => setPublishForm(f => ({ ...f, from: e.target.value }))} />
                        <p className="text-xs text-gray-400 mt-1">Leave as now, or set a future time to publish automatically.</p>
                      </div>
                      <div>
                        <label className="label">Auto-Hide After</label>
                        <input type="datetime-local" className="input-field" value={publishForm.to} onChange={e => setPublishForm(f => ({ ...f, to: e.target.value }))} />
                        <p className="text-xs text-gray-400 mt-1">When this time passes, students can no longer see the results.</p>
                      </div>
                    </div>
                    <div>
                      <p className="label">Quick set (starts now):</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => quickDuration(1)} className="btn-outline text-xs">1 hour</button>
                        <button type="button" onClick={() => quickDuration(24)} className="btn-outline text-xs">24 hours</button>
                        <button type="button" onClick={() => quickDuration(24 * 7)} className="btn-outline text-xs">1 week</button>
                        <button type="button" onClick={() => quickDuration(24 * 14)} className="btn-outline text-xs">2 weeks</button>
                      </div>
                    </div>
                  </>
                )}
                <button onClick={confirmPublish} className="btn-success w-full justify-center"><Send size={16} /> Publish Results</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Result Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Add Result</h2>
                <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4">
                <div><label className="label">Student</label><select className="input-field" value={addForm.student} onChange={e => setAddForm({ ...addForm, student: e.target.value })} required>
                  <option value="">Select Student</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.admissionNumber} - {s.firstName} {s.lastName}</option>)}
                </select></div>
                <div><label className="label">Subject</label><select className="input-field" value={addForm.subject} onChange={e => setAddForm({ ...addForm, subject: e.target.value })} required>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select></div>
                <div><label className="label">Class</label><select className="input-field" value={addForm.className} onChange={e => setAddForm({ ...addForm, className: e.target.value })} required>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select></div>
                {activeYear && <input type="hidden" value={activeYear._id} />}
                <div><label className="label">Academic Year</label><select className="input-field" value={addForm.academicYear} onChange={e => setAddForm({ ...addForm, academicYear: e.target.value })}>
                  <option value="">Select Year</option>
                  {academicYears.map(y => <option key={y._id} value={y._id}>{y.name}</option>)}
                </select></div>
                <div><label className="label">Term</label><select className="input-field" value={addForm.term} onChange={e => setAddForm({ ...addForm, term: e.target.value })}>
                  <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                </select></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="label">Term Mark (%)</label><input type="number" className="input-field" min="0" max="100" value={addForm.termMark} onChange={e => setAddForm({ ...addForm, termMark: +e.target.value })} /></div>
                  <div><label className="label">Exam Mark (%)</label><input type="number" className="input-field" min="0" max="100" value={addForm.examMark} onChange={e => setAddForm({ ...addForm, examMark: +e.target.value })} /></div>
                  <div><label className="label">Project Mark (%)</label><input type="number" className="input-field" min="0" max="100" value={addForm.projectMark} onChange={e => setAddForm({ ...addForm, projectMark: +e.target.value })} /></div>
                </div>
                <div><label className="label">Teacher Remark</label><input className="input-field" value={addForm.teacherRemark} onChange={e => setAddForm({ ...addForm, teacherRemark: e.target.value })} /></div>
                <button type="submit" className="btn-primary w-full justify-center">Add Result</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Result Modal */}
      <AnimatePresence>
        {showEditModal && editResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Edit Result</h2>
                <button onClick={() => setShowEditModal(false)}><X size={20} /></button>
              </div>
              <div className="text-sm text-gray-500 mb-4">
                {editResult.student?.firstName} {editResult.student?.lastName} - {editResult.subject?.name} ({editResult.term})
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="label">Term Mark (%)</label><input type="number" className="input-field" min="0" max="100" value={editForm.termMark} onChange={e => setEditForm({ ...editForm, termMark: +e.target.value })} /></div>
                  <div><label className="label">Exam Mark (%)</label><input type="number" className="input-field" min="0" max="100" value={editForm.examMark} onChange={e => setEditForm({ ...editForm, examMark: +e.target.value })} /></div>
                  <div><label className="label">Project Mark (%)</label><input type="number" className="input-field" min="0" max="100" value={editForm.projectMark} onChange={e => setEditForm({ ...editForm, projectMark: +e.target.value })} /></div>
                </div>
                <div><label className="label">Teacher Remark</label><input className="input-field" value={editForm.teacherRemark} onChange={e => setEditForm({ ...editForm, teacherRemark: e.target.value })} /></div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500">Calculated Final</p>
                  <p className="text-xl font-bold">{Math.round((editForm.examMark * 0.8 + editForm.projectMark * 0.2) * 100) / 100}%</p>
                </div>
                <button onClick={handleEdit} className="btn-primary w-full justify-center">Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Excel Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Upload Marks (Excel)</h2>
                <button onClick={() => setShowUploadModal(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="label">Subject</label><select className="input-field" value={uploadSubject} onChange={e => setUploadSubject(e.target.value)}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select></div>
                <div><label className="label">Class</label><select className="input-field" value={uploadClass} onChange={e => setUploadClass(e.target.value)}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select></div>
                <div><label className="label">Term</label><select className="input-field" value={uploadTerm} onChange={e => setUploadTerm(e.target.value)}>
                  <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                </select></div>
                <div>
                  <label className="label">Excel File</label>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="input-field" />
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">How it works:</p>
                  <p>1. Click <strong>Download Template</strong> — it contains the names of all students in the selected class.</p>
                  <p>2. Enter the marks next to each student's name.</p>
                  <p>3. Re-upload the same file.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={downloadTemplate} className="btn-outline text-sm flex-1 justify-center"><Download size={14} /> Download Template</button>
                  <button onClick={handleUpload} className="btn-primary text-sm flex-1 justify-center"><Upload size={14} /> Upload</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
