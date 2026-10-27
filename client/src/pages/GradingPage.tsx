import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GradingPage() {
  const [gradings, setGradings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', examBoard: 'ZIMSEC', isActive: false,
    levels: [
      { grade: 'A', minMark: 80, maxMark: 100, points: 5, remark: 'Excellent' },
      { grade: 'B', minMark: 70, maxMark: 79, points: 4, remark: 'Very Good' },
      { grade: 'C', minMark: 60, maxMark: 69, points: 3, remark: 'Good' },
      { grade: 'D', minMark: 50, maxMark: 59, points: 2, remark: 'Satisfactory' },
      { grade: 'E', minMark: 40, maxMark: 49, points: 1, remark: 'Acceptable' },
      { grade: 'U', minMark: 0, maxMark: 39, points: 0, remark: 'Unsatisfactory' },
    ]
  });

  const fetchGradings = () => {
    api.get('/grading').then(res => { setGradings(res.data.gradings); setLoading(false); });
  };

  useEffect(() => { fetchGradings(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/grading', form);
      toast.success('Grading system created'); setShowModal(false); fetchGradings();
    } catch (err: any) { toast.error(err.response?.data?.message); }
  };

  const applyGrading = async (id: string) => {
    if (!confirm('Apply this grading system to all results?')) return;
    await api.put(`/grading/${id}/apply`);
    toast.success('Grading applied'); fetchGradings();
  };

  const deleteGrading = async (id: string) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/grading/${id}`);
    toast.success('Deleted'); fetchGradings();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grading Systems</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={18} /> Add Grading</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {gradings.map(g => (
          <div key={g._id} className={`card ${g.isActive ? 'ring-2 ring-mlk-red' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{g.name}</h3>
                <p className="text-xs text-gray-500">{g.examBoard || "ZIMSEC"} grading</p>
                {g.isActive && <span className="badge badge-success">Active</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => applyGrading(g._id)} className="btn-primary text-sm"><CheckCircle size={14} /> Apply</button>
                <button onClick={() => deleteGrading(g._id)} className="btn-danger text-sm"><Trash2 size={14} /></button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-3 py-2 text-xs">Grade</th>
                  <th className="px-3 py-2 text-xs">Min</th>
                  <th className="px-3 py-2 text-xs">Max</th>
                  <th className="px-3 py-2 text-xs">Points</th>
                  <th className="px-3 py-2 text-xs">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {g.levels.map((l: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-sm font-bold">{l.grade}</td>
                    <td className="px-3 py-2 text-sm">{l.minMark}</td>
                    <td className="px-3 py-2 text-sm">{l.maxMark}</td>
                    <td className="px-3 py-2 text-sm">{l.points}</td>
                    <td className="px-3 py-2 text-sm">{l.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Grading System</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">Name</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="label">Examination Board *</label><select className="input-field" value={form.examBoard} onChange={e => setForm({ ...form, examBoard: e.target.value })} required><option value="ZIMSEC">ZIMSEC</option><option value="Cambridge">Cambridge</option></select></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                <span className="text-sm">Set as active</span>
              </div>
              {form.levels.map((l, i) => (
                <div key={i} className="grid grid-cols-5 gap-2">
                  <input className="input-field text-center font-bold" value={l.grade} onChange={e => { const n = [...form.levels]; n[i].grade = e.target.value; setForm({ ...form, levels: n }); }} />
                  <input type="number" className="input-field" value={l.minMark} onChange={e => { const n = [...form.levels]; n[i].minMark = +e.target.value; setForm({ ...form, levels: n }); }} />
                  <input type="number" className="input-field" value={l.maxMark} onChange={e => { const n = [...form.levels]; n[i].maxMark = +e.target.value; setForm({ ...form, levels: n }); }} />
                  <input type="number" className="input-field" value={l.points} onChange={e => { const n = [...form.levels]; n[i].points = +e.target.value; setForm({ ...form, levels: n }); }} />
                  <input className="input-field text-xs" value={l.remark} onChange={e => { const n = [...form.levels]; n[i].remark = e.target.value; setForm({ ...form, levels: n }); }} />
                </div>
              ))}
              <button type="submit" className="btn-primary w-full justify-center">Create</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
