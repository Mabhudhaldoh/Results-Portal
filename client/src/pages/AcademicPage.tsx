import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Play, Trash2, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function AcademicPage() {
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', terms: [{ name: 'Term 1' }, { name: 'Term 2' }, { name: 'Term 3' }] });

  const fetchYears = () => {
    api.get('/academic').then(res => { setYears(res.data.years); setLoading(false); });
  };

  useEffect(() => { fetchYears(); }, []);

  const createYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/academic', form);
      toast.success('Academic year created'); setShowModal(false); fetchYears();
    } catch (err: any) { toast.error(err.response?.data?.message); }
  };

  const activateYear = async (id: string) => {
    await api.put(`/academic/${id}/activate`);
    toast.success('Year activated'); fetchYears();
  };

  const deleteYear = async (id: string) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/academic/${id}`);
    toast.success('Deleted'); fetchYears();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Academic Years</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={18} /> Add Year</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {years.map(year => (
          <motion.div key={year._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`card ${year.isActive ? 'ring-2 ring-mlk-red' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{year.name}</h3>
              {year.isActive && <span className="badge badge-success">Active</span>}
            </div>
            <div className="space-y-2 mb-4">
              {year.terms?.map((term: any) => (
                <div key={term._id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm">{term.name}</span>
                  {term.isActive && <span className="badge badge-success text-xs">Active</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {!year.isActive && <button onClick={() => activateYear(year._id)} className="btn-primary text-sm flex-1 justify-center"><Play size={14} /> Activate</button>}
              <button onClick={() => deleteYear(year._id)} className="btn-danger text-sm"><Trash2 size={14} /></button>
            </div>
          </motion.div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Add Academic Year</h2>
            <form onSubmit={createYear} className="space-y-4">
              <div><label className="label">Year Name</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2026" required /></div>
              <p className="text-sm text-gray-500">Terms (Term 1, 2, 3) will be created automatically</p>
              <button type="submit" className="btn-primary w-full justify-center">Create</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
