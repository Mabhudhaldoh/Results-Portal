import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit2, Trash2, Key, X, CalendarClock, ShieldCheck, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface AccountUser {
  _id: string; firstName: string; lastName: string; email: string; phone?: string;
  role: string; isActive: boolean; employeeNumber?: string; admissionNumber?: string;
  accountExpiresAt?: string | null; lastLogin?: string;
}

const ROLES = ['admin', 'headmaster', 'finance', 'teacher', 'student'];

const roleBadge = (role: string) => {
  const map: Record<string, string> = { admin: 'badge-danger', headmaster: 'badge-purple', finance: 'badge-warning', teacher: 'badge-info', student: 'badge-success' };
  return <span className={`badge ${map[role] || 'badge-info'}`}>{role}</span>;
};

function isoToLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<AccountUser | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: 'headmaster',
    employeeNumber: '', admissionNumber: '', password: 'password123', accountExpiresAt: '',
  });

  const fetchUsers = () => {
    const params = new URLSearchParams();
    if (roleFilter) params.set('role', roleFilter);
    if (search) params.set('search', search);
    params.set('limit', '500');
    api.get(`/users?${params.toString()}`).then(res => { setUsers(res.data.users || []); setLoading(false); });
  };

  useEffect(() => { fetchUsers(); }, [search, roleFilter]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'headmaster', employeeNumber: '', admissionNumber: '', password: 'password123', accountExpiresAt: '' });
    setShowModal(true);
  };

  const openEdit = (u: AccountUser) => {
    setEditUser(u);
    setForm({
      firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone || '',
      role: u.role, employeeNumber: u.employeeNumber || '', admissionNumber: u.admissionNumber || '',
      password: '', accountExpiresAt: isoToLocalInput(u.accountExpiresAt),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser && form.password.length < 6) return toast.error('Password must be at least 6 characters');
    try {
      const payload: any = {
        firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone,
        role: form.role, accountExpiresAt: form.accountExpiresAt ? new Date(form.accountExpiresAt).toISOString() : null,
      };
      if (form.role === 'student' && form.admissionNumber) payload.admissionNumber = form.admissionNumber;
      if (form.role !== 'student' && form.employeeNumber) payload.employeeNumber = form.employeeNumber;
      if (editUser) {
        await api.put(`/users/${editUser._id}`, payload);
        toast.success('Account updated');
      } else {
        await api.post('/users', { ...payload, password: form.password });
        toast.success('Account created - user can now log in');
      }
      setShowModal(false); fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error saving account'); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this account? This cannot be undone.')) return;
    await api.delete(`/users/${id}`);
    toast.success('Account deleted'); fetchUsers();
  };

  const resetPassword = async (id: string) => {
    if (!confirm('Reset this account password to password123?')) return;
    await api.put(`/users/${id}/reset-password`, {});
    toast.success('Password reset to password123'); fetchUsers();
  };

  const toggleActive = async (u: AccountUser) => {
    await api.put(`/users/${u._id}/toggle-active`, {});
    toast.success(u.isActive ? 'Account disabled' : 'Account enabled'); fetchUsers();
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Accounts</h1>
          <p className="text-sm text-gray-500">Create Finance, Headmaster and Administrator accounts, grant roles and set access expiry periods.</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Add Account</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="input-field pl-10" />
          </div>
          <select className="input-field w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Access Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={6}><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded m-3"></div></td></tr>)
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No accounts found</td></tr>
              ) : users.map(u => {
                const expired = u.accountExpiresAt && new Date(u.accountExpiresAt) < now;
                return (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-sm">
                      {u.accountExpiresAt ? (
                        <span className={`flex items-center gap-1 ${expired ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          <CalendarClock size={14} /> {new Date(u.accountExpiresAt).toLocaleString()} {expired && '(expired)'}
                        </span>
                      ) : <span className="text-gray-400">Never</span>}
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${expired ? 'badge-danger' : u.isActive ? 'badge-success' : 'badge-danger'}`}>{expired ? 'Expired' : u.isActive ? 'Active' : 'Disabled'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Edit / Change Role"><ShieldCheck size={16} /></button>
                        <button onClick={() => resetPassword(u._id)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600" title="Reset Password"><Key size={16} /></button>
                        <button onClick={() => toggleActive(u)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600" title={u.isActive ? 'Disable' : 'Enable'}><UserCheck size={16} /></button>
                        <button onClick={() => deleteUser(u._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{editUser ? 'Edit Account / Grant Role' : 'Add Account'}</h2>
                <button onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">First Name</label><input className="input-field" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></div>
                  <div><label className="label">Last Name</label><input className="input-field" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Email</label><input className="input-field" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                  <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Role</label>
                    <select className="input-field" value={form.role} onChange={e => {
                      const role = e.target.value;
                      setForm({ ...form, role, password: role === 'student' ? 'student123' : role === 'teacher' ? 'teacher123' : 'password123' });
                    }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Selecting <b>admin</b> grants full administrative rights.</p>
                  </div>
                  <div>
                    <label className="label">{form.role === 'student' ? 'Admission Number' : 'Employee Number'}</label>
                    <input className="input-field" value={form.role === 'student' ? form.admissionNumber : form.employeeNumber} onChange={e => form.role === 'student' ? setForm({ ...form, admissionNumber: e.target.value }) : setForm({ ...form, employeeNumber: e.target.value })} />
                  </div>
                </div>
                {!editUser && (
                  <div>
                    <label className="label">Temporary Password</label>
                    <input className="input-field" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                    <p className="text-xs text-gray-400 mt-1">User changes this after first login from their dashboard.</p>
                  </div>
                )}
                <div>
                  <label className="label">Access Expires On (optional)</label>
                  <input type="datetime-local" className="input-field" value={form.accountExpiresAt} onChange={e => setForm({ ...form, accountExpiresAt: e.target.value })} />
                  <p className="text-xs text-gray-400 mt-1">Leave empty for permanent access. The account will be blocked after this time.</p>
                </div>
                <button type="submit" className="btn-primary w-full justify-center">{editUser ? 'Update Account' : 'Create Account'}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
