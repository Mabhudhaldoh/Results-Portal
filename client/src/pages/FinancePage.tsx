import { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, Plus, Search, Edit2, CheckCircle, X, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface StudentFees {
  _id: string; admissionNumber: string; firstName: string; lastName: string;
  className: { _id: string; name: string } | null;
  feesRequired: number; feesPaid: number; feesBalance: number;
}

export default function FinancePage() {
  const [students, setStudents] = useState<StudentFees[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentFees | null>(null);
  const [paymentForm, setPaymentForm] = useState({ studentId: '', amount: '', method: 'Cash', reference: '', description: '' });
  const [feesRequiredForm, setFeesRequiredForm] = useState('');

  const fetchData = async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        api.get(`/students?search=${search}${classFilter ? `&className=${classFilter}` : ''}`),
        api.get('/classes'),
      ]);
      setStudents(studentsRes.data.students);
      setClasses(classesRes.data.classes);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search, classFilter]);

  const feesStatus = (s: StudentFees) => {
    if (s.feesBalance <= 0) return { label: 'Paid', cls: 'badge-success' };
    if (s.feesPaid > 0) return { label: 'Partial', cls: 'badge-warning' };
    return { label: 'Unpaid', cls: 'badge-danger' };
  };

  const filteredStudents = students.filter(s => {
    if (statusFilter === 'paid' && s.feesBalance > 0) return false;
    if (statusFilter === 'unpaid' && s.feesBalance <= 0) return false;
    if (statusFilter === 'partial' && (s.feesPaid <= 0 || s.feesBalance <= 0)) return false;
    return true;
  });

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = parseFloat(paymentForm.amount);
      if (amount <= 0) { toast.error('Amount must be positive'); return; }
      await api.post('/fees/payment', { ...paymentForm, amount });
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      setPaymentForm({ studentId: '', amount: '', method: 'Cash', reference: '', description: '' });
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Error recording payment'); }
  };

  const handleSetFeesRequired = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    try {
      const amount = parseFloat(feesRequiredForm);
      if (isNaN(amount) || amount < 0) { toast.error('Invalid amount'); return; }
      await api.put(`/fees/${editStudent._id}`, { feesRequired: amount });
      toast.success('Fees updated');
      setShowEditModal(false);
      setEditStudent(null);
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Error updating fees'); }
  };

  const totalRequired = filteredStudents.reduce((s, st) => s + (st.feesRequired || 0), 0);
  const totalPaid = filteredStudents.reduce((s, st) => s + (st.feesPaid || 0), 0);
  const totalBalance = filteredStudents.reduce((s, st) => s + (st.feesBalance || 0), 0);
  const unpaidCount = filteredStudents.filter(s => s.feesBalance > 0).length;
  const paidCount = filteredStudents.filter(s => s.feesBalance <= 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign size={24} /> Finance Department
        </h1>
        <button onClick={() => { setShowPaymentModal(true); setPaymentForm({ studentId: '', amount: '', method: 'Cash', reference: '', description: '' }); }} className="btn-primary">
          <Plus size={18} /> Record Payment
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><DollarSign size={20} className="text-red-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Required</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">${totalRequired.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><TrendingUp size={20} className="text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Collected</p>
              <p className="text-lg font-bold text-green-600">${totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><AlertTriangle size={20} className="text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Outstanding</p>
              <p className="text-lg font-bold text-red-600">${totalBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Students</p>
              <p className="text-lg font-bold">{paidCount} paid / {unpaidCount} owe</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or admission number..." className="input-field pl-10" />
          </div>
          <select className="input-field max-w-xs" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select className="input-field max-w-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Adm No.</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3 text-right">Required</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
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
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No students found</td></tr>
              ) : (
                filteredStudents.map(s => {
                  const status = feesStatus(s);
                  return (
                    <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm font-mono">{s.admissionNumber}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.firstName} {s.lastName}</td>
                      <td className="px-4 py-3 text-sm">{s.className?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right">${(s.feesRequired || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">${(s.feesPaid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">${(s.feesBalance || 0).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`badge ${status.cls}`}>{status.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditStudent(s); setFeesRequiredForm(String(s.feesRequired || 0)); setShowEditModal(true); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600"><Edit2 size={16} /></button>
                          <button onClick={() => { setPaymentForm({ ...paymentForm, studentId: s._id }); setShowPaymentModal(true); }} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg text-green-600"><CheckCircle size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showPaymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Record Payment</h2>
                <button onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="label">Student</label>
                  <select className="input-field" value={paymentForm.studentId} onChange={e => setPaymentForm({ ...paymentForm, studentId: e.target.value })} required>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.admissionNumber})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Amount ($)</label>
                    <input type="number" step="0.01" min="0.01" className="input-field" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Payment Method</label>
                    <select className="input-field" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                      <option>Cash</option><option>Bank</option><option>Mobile</option>
                    </select>
                  </div>
                </div>
                <div><label className="label">Reference</label><input className="input-field" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="e.g. receipt number" /></div>
                <div><label className="label">Description</label><input className="input-field" value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="e.g. Term 1 fees" /></div>
                <button type="submit" className="btn-primary w-full justify-center">Record Payment</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && editStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowEditModal(false); setEditStudent(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Set Fees Required - {editStudent.firstName} {editStudent.lastName}</h2>
                <button onClick={() => { setShowEditModal(false); setEditStudent(null); }}><X size={20} /></button>
              </div>
              <div className="mb-4 text-sm text-gray-500">
                Current: Required ${(editStudent.feesRequired || 0).toLocaleString()} | Paid ${(editStudent.feesPaid || 0).toLocaleString()} | Balance ${(editStudent.feesBalance || 0).toLocaleString()}
              </div>
              <form onSubmit={handleSetFeesRequired} className="space-y-4">
                <div><label className="label">New Fees Required ($)</label><input type="number" step="0.01" min="0" className="input-field" value={feesRequiredForm} onChange={e => setFeesRequiredForm(e.target.value)} required /></div>
                <button type="submit" className="btn-primary w-full justify-center">Update Fees</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
