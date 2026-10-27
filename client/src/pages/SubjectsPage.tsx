import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', category: 'General', examBoard: 'ZIMSEC' });
  const [filter, setFilter] = useState('');
  const [boardFilter, setBoardFilter] = useState('');

  const fetchSubjects = () => {
    const params = new URLSearchParams();
    if (filter) params.set('category', filter);
    if (boardFilter) params.set('examBoard', boardFilter);
    const q = params.toString() ? `?${params.toString()}` : '';
    api.get(`/subjects${q}`).then(res => { setSubjects(res.data.subjects); setLoading(false); });
  };

  useEffect(() => { fetchSubjects(); }, [filter, boardFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editSubject) {
        await api.put(`/subjects/${editSubject._id}`, form);
        toast.success('Subject updated');
      } else {
        await api.post('/subjects', form);
        toast.success('Subject created');
      }
      setShowModal(false); setEditSubject(null); fetchSubjects();
    } catch (err: any) { toast.error(err.response?.data?.message); }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/subjects/${id}`);
    toast.success('Deleted'); fetchSubjects();
  };

  const categories = ['All', 'Arts', 'Sciences', 'Commercials', 'General'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subjects ({subjects.length})</h1>
        <button onClick={() => { setShowModal(true); setEditSubject(null); setForm({ name: '', code: '', category: 'General', examBoard: 'ZIMSEC' }); }} className="btn-primary"><Plus size={18} /> Add Subject</button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium">Examination Board</label>
        <select className="input-field max-w-xs" value={boardFilter} onChange={e => setBoardFilter(e.target.value)}><option value="">All Boards</option><option value="ZIMSEC">ZIMSEC</option><option value="Cambridge">Cambridge</option></select>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c === 'All' ? '' : c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${(!filter && c === 'All') || filter === c ? 'bg-mlk-blue text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Board</th>
                <th className="px-4 py-3">Teachers</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {subjects.map(s => (
                <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm font-mono">{s.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                  <td className="px-4 py-3"><span className={`badge ${s.category === 'Sciences' ? 'badge-success' : s.category === 'Arts' ? 'badge-info' : s.category === 'Commercials' ? 'badge-warning' : 'badge-gray'}`}>{s.category}</span></td>
                  <td className="px-4 py-3"><span className="badge badge-info">{s.examBoard || 'ZIMSEC'}</span></td>
                  <td className="px-4 py-3 text-sm">{s.teachers?.length || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditSubject(s); setForm({ name: s.name, code: s.code, category: s.category, examBoard: s.examBoard || 'ZIMSEC' }); setShowModal(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => deleteSubject(s._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{editSubject ? 'Edit Subject' : 'Add Subject'}</h2>
                <button onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="label">Subject Name</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><label className="label">Code</label><input className="input-field" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required /></div>
                <div><label className="label">Category</label><select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option>General</option><option>Arts</option><option>Sciences</option><option>Commercials</option>
                </select></div>
                <div><label className="label">Examination Board *</label><select className="input-field" value={form.examBoard} onChange={e => setForm({ ...form, examBoard: e.target.value })} required><option value="ZIMSEC">ZIMSEC</option><option value="Cambridge">Cambridge</option></select></div>
                <button type="submit" className="btn-primary w-full justify-center">{editSubject ? 'Update' : 'Create'} Subject</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
