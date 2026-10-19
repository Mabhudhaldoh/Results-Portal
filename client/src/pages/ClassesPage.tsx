import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', streams: ['A', 'B', 'C', 'D'] });

  const fetchClasses = () => {
    api.get('/classes').then(res => { setClasses(res.data.classes); setLoading(false); });
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/classes', form);
      toast.success('Class created'); setShowModal(false); fetchClasses();
    } catch (err: any) { toast.error(err.response?.data?.message); }
  };

  const deleteClass = async (id: string) => {
    if (!confirm('Delete this class and all its streams?')) return;
    await api.delete(`/classes/${id}`);
    toast.success('Class deleted'); fetchClasses();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Classes ({classes.length})</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={18} /> Add Class</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="card animate-pulse"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div></div>)
        ) : (
          classes.map(cls => (
            <motion.div key={cls._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cls.name}</h3>
                <button onClick={() => deleteClass(cls._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600"><Trash2 size={16} /></button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {cls.streams?.map((s: any) => (
                  <span key={s._id} className="badge badge-info">{s.name}</span>
                ))}
              </div>
              {cls.classTeacher && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Class Teacher: {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                </p>
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Add Class</h2>
                <button onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="label">Class Name</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Form 1" required /></div>
                <div><label className="label">Streams (comma-separated)</label><input className="input-field" value={form.streams.join(', ')} onChange={e => setForm({ ...form, streams: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div>
                <button type="submit" className="btn-primary w-full justify-center">Create Class</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
