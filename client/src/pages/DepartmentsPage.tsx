import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '' });

  const fetchDepartments = () => {
    api.get('/departments').then(res => { setDepartments(res.data.departments); setLoading(false); });
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/departments', form);
      toast.success('Department created'); setShowModal(false); fetchDepartments();
    } catch (err: any) { toast.error(err.response?.data?.message); }
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/departments/${id}`);
    toast.success('Deleted'); fetchDepartments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Departments ({departments.length})</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={18} /> Add Department</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {departments.map(d => (
          <div key={d._id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{d.name}</h3>
              <button onClick={() => deleteDepartment(d._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={16} /></button>
            </div>
            {d.head && <p className="text-sm text-gray-500 mt-2">Head: {d.head.firstName} {d.head.lastName}</p>}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Department</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">Department Name</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <button type="submit" className="btn-primary w-full justify-center">Create</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
