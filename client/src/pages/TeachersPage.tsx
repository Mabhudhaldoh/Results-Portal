import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit2, Trash2, Key, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Teacher {
  _id: string; employeeNumber: string; firstName: string; lastName: string;
  email: string; phone: string; department: string; role?: string;
  assignedSubjects: { name: string; code: string }[];
  assignedClasses: { name: string }[];
  isActive: boolean;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', employeeNumber: '', phone: '', department: '' });

  const fetchTeachers = () => {
    api.get(`/teachers?search=${search}`).then(res => { setTeachers(res.data.teachers); setLoading(false); });
  };

  useEffect(() => { fetchTeachers(); }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editTeacher) {
        await api.put(`/users/${editTeacher._id}`, form);
        toast.success('Updated');
      } else {
        await api.post('/users', { ...form, role: 'teacher', password: 'teacher123' });
        toast.success('Teacher created');
      }
      setShowModal(false); setEditTeacher(null); fetchTeachers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const deleteTeacher = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/users/${id}`);
    toast.success('Deleted');
    fetchTeachers();
  };

  const resetPassword = async (id: string) => {
    if (!confirm('Reset password to default (password123)?')) return;
    await api.put(`/users/${id}/reset-password`, {});
    toast.success('Password reset to password123');
  };

  const roleBadge = (role?: string) => {
    if (role === 'headmaster') return <span className="badge badge-purple">Headmaster</span>;
    if (role === 'finance') return <span className="badge badge-warning">Finance</span>;
    return <span className="badge badge-info">Teacher</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff ({teachers.length})</h1>
        <button onClick={() => { setShowModal(true); setEditTeacher(null); setForm({ firstName: '', lastName: '', email: '', employeeNumber: '', phone: '', department: '' }); }} className="btn-primary">
          <Plus size={18} /> Add Staff
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." className="input-field pl-10" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Emp No.</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Subjects</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>)}
                  </tr>
                ))
              ) : teachers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No staff found</td></tr>
              ) : (
                teachers.map(t => (
                  <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">{roleBadge(t.role)}</td>
                    <td className="px-4 py-3 text-sm font-mono">{t.employeeNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium">{t.firstName} {t.lastName}</td>
                    <td className="px-4 py-3 text-sm">{t.email}</td>
                    <td className="px-4 py-3 text-sm">{t.phone}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {t.assignedSubjects?.map((s, i) => <span key={i} className="badge badge-info">{s.name}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${t.isActive ? 'badge-success' : 'badge-danger'}`}>{t.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditTeacher(t); setForm({ firstName: t.firstName, lastName: t.lastName, email: t.email, employeeNumber: t.employeeNumber, phone: t.phone, department: t.department || '' }); setShowModal(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => resetPassword(t._id)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600" title="Reset Password"><Key size={16} /></button>
                        <button onClick={() => deleteTeacher(t._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{editTeacher ? 'Edit Staff' : 'Add Staff'}</h2>
                <button onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">First Name</label><input className="input-field" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></div>
                  <div><label className="label">Last Name</label><input className="input-field" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Employee Number</label><input className="input-field" value={form.employeeNumber} onChange={e => setForm({ ...form, employeeNumber: e.target.value })} required /></div>
                  <div><label className="label">Email</label><input className="input-field" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><label className="label">Department</label><input className="input-field" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                </div>
                <button type="submit" className="btn-primary w-full justify-center">{editTeacher ? 'Update' : 'Create'} Staff</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
