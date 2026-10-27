import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Plus, Search, Edit2, Trash2, Key, UserCheck, UserX, Upload, X, DollarSign, Download, Table, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface Student {
  _id: string; admissionNumber: string; firstName: string; lastName: string;
  gender: string; examBoard?: string; email: string; phone: string; parentName: string; parentPhone: string;
  className: { _id: string; name: string }; stream: { _id: string; name: string };
  isActive: boolean; enrollmentYear: number; address?: string; sports?: string;
  feesPaid?: number; feesRequired?: number; feesBalance?: number;
}

const emptyRow = { admissionNumber: '', firstName: '', lastName: '', gender: 'Male', examBoard: 'ZIMSEC', className: '', phone: '', parentName: '', parentPhone: '' };

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', admissionNumber: '', gender: 'Male', examBoard: 'ZIMSEC',
    phone: '', parentName: '', parentPhone: '', address: '', enrollmentYear: 2026,
    className: '', stream: '', sports: '',
  });
  const [streams, setStreams] = useState<any[]>([]);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [feesStudent, setFeesStudent] = useState<Student | null>(null);
  const [feesRequired, setFeesRequired] = useState(500);
  const [feesPaid, setFeesPaid] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickRows, setQuickRows] = useState<any[]>([{ ...emptyRow }]);
  const [quickSaving, setQuickSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({ className: '', stream: '', gender: '', sports: '', parentName: '', parentPhone: '', feesRequired: '', feesPaid: '', isActive: '' });
  const [bulkStreams, setBulkStreams] = useState<any[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const fetchStudents = () => {
    api.get(`/students?search=${search}`).then(res => { setStudents(res.data.students); setLoading(false); });
  };

  useEffect(() => { fetchStudents(); api.get('/classes').then(r => setClasses(r.data.classes)); }, [search]);

  useEffect(() => {
    if (form.className) {
      const cls = classes.find((c: any) => c._id === form.className);
      setStreams(cls?.streams || []);
      if (form.className !== (editStudent?.className as any)?._id) {
        setForm(f => ({ ...f, stream: '' }));
      }
    } else {
      setStreams([]);
    }
  }, [form.className, classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...form };
      if (!payload.className) { toast.error('Please select a class'); return; }
      if (editStudent) {
        await api.put(`/users/${editStudent._id}`, payload);
        toast.success('Student updated');
        setShowModal(false); setEditStudent(null);
      } else {
        await api.post('/users', { ...payload, role: 'student', password: 'student123' });
        toast.success(`${payload.firstName} ${payload.lastName} created`);
        setForm({ firstName: '', lastName: '', email: '', admissionNumber: '', gender: 'Male', examBoard: 'ZIMSEC', phone: '', parentName: '', parentPhone: '', address: '', enrollmentYear: 2026, className: '', stream: '', sports: '' });
      }
      fetchStudents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const toggleActive = async (id: string) => {
    await api.put(`/users/${id}/toggle-active`);
    toast.success('Status toggled');
    fetchStudents();
  };

  const resetPassword = async (id: string) => {
    await api.put(`/users/${id}/reset-password`, { password: 'student123' });
    toast.success('Password reset to student123');
  };

  const deleteStudent = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    await api.delete(`/users/${id}`);
    toast.success('Student deleted');
    fetchStudents();
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => {
    if (selected.length === students.length && students.length > 0) setSelected([]);
    else setSelected(students.map(s => s._id));
  };

  const openBulkModal = () => {
    setBulkForm({ className: '', stream: '', gender: '', sports: '', parentName: '', parentPhone: '', feesRequired: '', feesPaid: '', isActive: '' });
    setBulkStreams([]);
    setShowBulkModal(true);
  };

  const bulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} selected student(s)? This also removes their results.`)) return;
    const res = await api.post('/users/bulk/delete', { ids: selected });
    toast.success(res.data.message || 'Students deleted');
    setSelected([]);
    fetchStudents();
  };

  const bulkSave = async () => {
    if (selected.length === 0) return toast.error('Select at least one student');
    if (bulkForm.stream && !bulkForm.className) return toast.error('Choose a class before setting a stream');
    const updates: any = {};
    if (bulkForm.className) updates.className = bulkForm.className;
    if (bulkForm.stream) updates.stream = bulkForm.stream;
    if (bulkForm.gender) updates.gender = bulkForm.gender;
    if (bulkForm.sports) updates.sports = bulkForm.sports;
    if (bulkForm.parentName) updates.parentName = bulkForm.parentName;
    if (bulkForm.parentPhone) updates.parentPhone = bulkForm.parentPhone;
    if (bulkForm.feesRequired !== '') updates.feesRequired = +bulkForm.feesRequired;
    if (bulkForm.feesPaid !== '') updates.feesPaid = +bulkForm.feesPaid;
    if (bulkForm.isActive) updates.isActive = bulkForm.isActive === 'Active';
    if (Object.keys(updates).length === 0) return toast.error('Set at least one value to update');
    setBulkSaving(true);
    try {
      const res = await api.put('/users/bulk/update', { ids: selected, updates });
      toast.success(res.data.message || 'Students updated');
      setShowBulkModal(false);
      setSelected([]);
      fetchStudents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Bulk update failed'); }
    setBulkSaving(false);
  };

  const handleFeesSave = async () => {
    if (!feesStudent) return;
    try {
      await api.put(`/users/${feesStudent._id}`, { feesRequired, feesPaid, feesBalance: feesRequired - feesPaid });
      toast.success('Fees updated');
      setShowFeesModal(false); setFeesStudent(null);
      fetchStudents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const addQuickRow = () => setQuickRows(r => [...r, { ...emptyRow }]);
  const removeQuickRow = (i: number) => setQuickRows(r => r.filter((_, idx) => idx !== i));
  const updateQuickRow = (i: number, field: string, value: string) => {
    setQuickRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  };

  const handleQuickAdd = async () => {
    const filled = quickRows.filter(r => r.admissionNumber.trim() && r.firstName.trim() && r.lastName.trim() && r.className.trim());
    if (filled.length === 0) { toast.error('Fill in at least one complete row (Adm No, First Name, Last Name, Class)'); return; }
    setQuickSaving(true);
    try {
      const res = await api.post('/students/bulk-quick', { students: filled });
      const created = res.data.created || 0;
      const errors = res.data.errors || [];
      if (errors.length > 0) {
        toast(`${created} students created (${errors.length} errors)`, { icon: '⚠️' });
        console.log('Quick add errors:', errors);
      } else {
        toast.success(`${created} students created successfully`);
      }
      setQuickRows([{ ...emptyRow }]);
      setShowQuickAdd(false);
      fetchStudents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Bulk add failed'); }
    setQuickSaving(false);
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) return toast.error('Select a file');
    setUploading(true);
    try {
      const arrayBuffer = await uploadFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const res = await api.post('/students/upload-excel', { file: uint8Array });
      const created = res.data.created || 0;
      const errors = res.data.errors || [];
      if (errors.length > 0) {
        toast(`${created} students created (${errors.length} errors)`, { icon: '⚠️' });
        console.log('Upload errors:', errors);
      } else {
        toast.success(`${created} students created successfully`);
      }
      setShowUploadModal(false); setUploadFile(null); fetchStudents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Upload failed'); }
    setUploading(false);
  };

  const downloadTemplate = () => {
    const headers = ['Admission Number', 'First Name', 'Last Name', 'Gender', 'Examination Board', 'Class', 'Phone', 'Parent Name', 'Parent Phone', 'Email', 'Address'];
    const exampleRows = [
      ['MLK2026011', 'Tapiwa', 'Chidhakwa', 'Male', 'ZIMSEC', 'Form 1', '+263771234567', 'Mr Chidhakwa', '+263771234568', '', ''],
      ['MLK2026012', 'Ropafadzo', 'Moyo', 'Female', 'ZIMSEC', 'Form 2', '+263771234569', 'Mrs Moyo', '+263771234570', '', ''],
      ['MLK2026013', 'Tatenda', 'Nhamo', 'Male', 'Cambridge', 'Form 3', '+263771234571', 'Mr Nhamo', '+263771234572', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 25 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students Template');
    XLSX.writeFile(wb, 'Students_Upload_Template.xlsx');
    toast.success('Template downloaded');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students ({students.length})</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowQuickAdd(true); setQuickRows([{ ...emptyRow }]); }} className="btn-secondary text-sm"><Table size={16} /> Quick Add Multiple</button>
          <button onClick={() => setShowUploadModal(true)} className="btn-secondary text-sm"><Upload size={16} /> Excel Upload</button>
          <button onClick={() => { setShowModal(true); setEditStudent(null); setForm({ firstName: '', lastName: '', email: '', admissionNumber: '', gender: 'Male', examBoard: 'ZIMSEC', phone: '', parentName: '', parentPhone: '', address: '', enrollmentYear: 2026, className: '', stream: '', sports: '' }); }} className="btn-primary">
            <Plus size={18} /> Add Student
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or admission number..." className="input-field pl-10" />
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{selected.length} selected</span>
              <button onClick={openBulkModal} className="btn-secondary text-sm"><Edit2 size={14} /> Bulk Edit</button>
              <button onClick={bulkDelete} className="btn-danger text-sm"><Trash2 size={14} /> Delete</button>
              <button onClick={() => setSelected([])} className="btn-outline text-sm"><X size={14} /> Clear</button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 w-10"><input type="checkbox" checked={selected.length === students.length && students.length > 0} onChange={selectAll} /></th>
                <th className="px-4 py-3">Adm No.</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Exam Board</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Stream</th>
                <th className="px-4 py-3">Fees Required</th>
                <th className="px-4 py-3">Fees Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(12)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>)}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-12 text-center text-gray-500">No students found</td></tr>
              ) : (
                students.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggleSelect(s._id)} /></td>
                    <td className="px-4 py-3 text-sm font-mono">{s.admissionNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium">{s.firstName} {s.lastName}</td>
                    <td className="px-4 py-3 text-sm">{s.gender}</td>
                    <td className="px-4 py-3 text-sm"><span className="badge badge-info">{s.examBoard || "ZIMSEC"}</span></td>
                    <td className="px-4 py-3 text-sm">{s.className?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{s.stream?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">${s.feesRequired || 0}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 font-medium">${s.feesPaid || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${(s.feesBalance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${(s.feesBalance != null ? s.feesBalance : (s.feesRequired || 0) - (s.feesPaid || 0))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditStudent(s); setForm({ firstName: s.firstName, lastName: s.lastName, email: s.email, admissionNumber: s.admissionNumber, gender: s.gender, examBoard: s.examBoard || 'ZIMSEC', phone: s.phone, parentName: s.parentName, parentPhone: s.parentPhone, address: s.address || '', enrollmentYear: s.enrollmentYear, className: s.className?._id || '', stream: s.stream?._id || '', sports: s.sports || '' }); setShowModal(true); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => toggleActive(s._id)} className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg text-amber-600">{s.isActive ? <UserX size={16} /> : <UserCheck size={16} />}</button>
                        <button onClick={() => resetPassword(s._id)} className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg text-purple-600"><Key size={16} /></button>
                        <button onClick={() => { setFeesStudent(s); setFeesRequired(s.feesRequired || 500); setFeesPaid(s.feesPaid || 0); setShowFeesModal(true); }} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg text-green-600" title="Edit Fees"><DollarSign size={16} /></button>
                        <button onClick={() => deleteStudent(s._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{editStudent ? 'Edit Student' : 'Add Student'}</h2>
                <button onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">First Name *</label><input className="input-field" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></div>
                  <div><label className="label">Last Name *</label><input className="input-field" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Admission Number *</label><input className="input-field" value={form.admissionNumber} onChange={e => setForm({ ...form, admissionNumber: e.target.value })} required /></div>
                  <div><label className="label">Email</label><input className="input-field" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Gender</label><select className="input-field" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option></select></div>
                  <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div><label className="label">Examination Board *</label><select className="input-field" value={form.examBoard || 'ZIMSEC'} onChange={e => setForm({ ...form, examBoard: e.target.value })} required><option value="ZIMSEC">ZIMSEC</option><option value="Cambridge">Cambridge</option></select><p className="text-xs text-gray-500 mt-1">Only subjects and grading systems for this board will be available to the student.</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Class *</label>
                    <select className="input-field" value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} required>
                      <option value="">Select class</option>
                      {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Stream</label>
                    <select className="input-field" value={form.stream} onChange={e => setForm({ ...form, stream: e.target.value })} disabled={!form.className}>
                      <option value="">Select stream</option>
                      {streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="label">Parent/Guardian Name</label><input className="input-field" value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} /></div>
                <div><label className="label">Parent Phone</label><input className="input-field" value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} /></div>
                <div><label className="label">Sports / Extra-Curricular</label><input className="input-field" value={form.sports} onChange={e => setForm({ ...form, sports: e.target.value })} placeholder="e.g. Football, Athletics, Netball" />
                  <p className="text-xs text-gray-500 mt-1">Shown on the student's report card. Separate multiple sports with commas.</p>
                </div>
                <button type="submit" className="btn-primary w-full justify-center">{editStudent ? 'Update' : 'Add Another'}</button>
                {!editStudent && <button type="button" onClick={() => { setShowModal(false); }} className="btn-outline w-full justify-center">Done Adding</button>}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fees Modal */}
      <AnimatePresence>
        {showFeesModal && feesStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFeesModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Fees - {feesStudent.firstName} {feesStudent.lastName}</h2>
                <button onClick={() => setShowFeesModal(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="label">Fees Required ($)</label><input type="number" className="input-field" value={feesRequired} onChange={e => setFeesRequired(+e.target.value)} /></div>
                <div><label className="label">Fees Paid ($)</label><input type="number" className="input-field" value={feesPaid} onChange={e => setFeesPaid(+e.target.value)} /></div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className={`text-xl font-bold ${feesRequired - feesPaid > 0 ? 'text-red-600' : 'text-emerald-600'}`}>${feesRequired - feesPaid}</p>
                </div>
                <button onClick={handleFeesSave} className="btn-primary w-full justify-center">Save Fees</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Edit Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBulkModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Bulk Edit {selected.length} Student(s)</h2>
                  <p className="text-sm text-gray-500">Only the fields you fill in will be applied to all selected students.</p>
                </div>
                <button onClick={() => setShowBulkModal(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Change Class To</label>
                    <select className="input-field" value={bulkForm.className} onChange={e => {
                      const classId = e.target.value;
                      const cls = classes.find((c: any) => c._id === classId);
                      setBulkForm(f => ({ ...f, className: classId, stream: '' }));
                      setBulkStreams(cls?.streams || []);
                    }}>
                      <option value="">Don't change</option>
                      {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Change Stream To</label>
                    <select className="input-field" value={bulkForm.stream} onChange={e => setBulkForm(f => ({ ...f, stream: e.target.value }))} disabled={!bulkForm.className}>
                      <option value="">Don't change</option>
                      {bulkStreams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Gender</label>
                    <select className="input-field" value={bulkForm.gender} onChange={e => setBulkForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">Don't change</option>
                      <option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="input-field" value={bulkForm.isActive} onChange={e => setBulkForm(f => ({ ...f, isActive: e.target.value }))}>
                      <option value="">Don't change</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div><label className="label">Sports / Extra-Curricular (replaces existing)</label><input className="input-field" value={bulkForm.sports} onChange={e => setBulkForm(f => ({ ...f, sports: e.target.value }))} placeholder="e.g. Football, Athletics" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Parent / Guardian Name</label><input className="input-field" value={bulkForm.parentName} onChange={e => setBulkForm(f => ({ ...f, parentName: e.target.value }))} /></div>
                  <div><label className="label">Parent Phone</label><input className="input-field" value={bulkForm.parentPhone} onChange={e => setBulkForm(f => ({ ...f, parentPhone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Fees Required ($)</label><input type="number" className="input-field" value={bulkForm.feesRequired} onChange={e => setBulkForm(f => ({ ...f, feesRequired: e.target.value }))} placeholder="Leave blank to keep" /></div>
                  <div><label className="label">Fees Paid ($)</label><input type="number" className="input-field" value={bulkForm.feesPaid} onChange={e => setBulkForm(f => ({ ...f, feesPaid: e.target.value }))} placeholder="Leave blank to keep" /></div>
                </div>
                <button onClick={bulkSave} disabled={bulkSaving} className="btn-primary w-full justify-center">
                  {bulkSaving ? 'Updating...' : `Update ${selected.length} Student(s)`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add Multiple Modal */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQuickAdd(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Quick Add Multiple Students</h2>
                  <p className="text-sm text-gray-500">Fill in each row. Class is required. Leave empty rows blank — they will be skipped.</p>
                </div>
                <button onClick={() => setShowQuickAdd(false)}><X size={20} /></button>
              </div>

              <div className="mb-3 flex items-center gap-3">
                <label className="label mb-0">Default class for all rows:</label>
                <select className="input-field w-auto" onChange={e => {
                  const classId = e.target.value;
                  const cls = classes.find((c: any) => c._id === classId);
                  if (cls) setQuickRows(r => r.map(row => ({ ...row, className: cls._id })));
                }}>
                  <option value="">Set class for all...</option>
                  {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <button onClick={() => setQuickRows(r => [...r, ...Array(10).fill(null).map(() => ({ ...emptyRow }))])} className="btn-outline text-sm"><Plus size={14} /> Add 10 Rows</button>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="px-2 py-2 text-left w-8">#</th>
                      <th className="px-2 py-2 text-left">Adm No *</th>
                      <th className="px-2 py-2 text-left">First Name *</th>
                      <th className="px-2 py-2 text-left">Last Name *</th>
                      <th className="px-2 py-2 text-left">Gender</th>
                      <th className="px-2 py-2 text-left">Exam Board *</th>
                      <th className="px-2 py-2 text-left">Class *</th>
                      <th className="px-2 py-2 text-left">Phone</th>
                      <th className="px-2 py-2 text-left">Parent Name</th>
                      <th className="px-2 py-2 text-left">Parent Phone</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {quickRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-2 py-1 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-1 py-1"><input className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600" value={row.admissionNumber} onChange={e => updateQuickRow(i, 'admissionNumber', e.target.value)} placeholder="MLK2026XXX" /></td>
                        <td className="px-1 py-1"><input className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600" value={row.firstName} onChange={e => updateQuickRow(i, 'firstName', e.target.value)} /></td>
                        <td className="px-1 py-1"><input className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600" value={row.lastName} onChange={e => updateQuickRow(i, 'lastName', e.target.value)} /></td>
                        <td className="px-1 py-1">
                          <select className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600" value={row.gender} onChange={e => updateQuickRow(i, 'gender', e.target.value)}>
                            <option>Male</option><option>Female</option>
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600" value={row.examBoard || 'ZIMSEC'} onChange={e => updateQuickRow(i, 'examBoard', e.target.value)}>
                            <option value="ZIMSEC">ZIMSEC</option><option value="Cambridge">Cambridge</option>
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600" value={row.className} onChange={e => updateQuickRow(i, 'className', e.target.value)}>
                            <option value="">-</option>
                            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-1"><input className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600" value={row.phone} onChange={e => updateQuickRow(i, 'phone', e.target.value)} /></td>
                        <td className="px-1 py-1"><input className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600" value={row.parentName} onChange={e => updateQuickRow(i, 'parentName', e.target.value)} /></td>
                        <td className="px-1 py-1"><input className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600" value={row.parentPhone} onChange={e => updateQuickRow(i, 'parentPhone', e.target.value)} /></td>
                        <td className="px-1 py-1">
                          {quickRows.length > 1 && <button onClick={() => removeQuickRow(i)} className="text-red-400 hover:text-red-600 p-1"><X size={14} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">{quickRows.filter(r => r.admissionNumber && r.firstName && r.lastName && r.className).length} students ready to create</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowQuickAdd(false)} className="btn-outline">Cancel</button>
                  <button onClick={handleQuickAdd} disabled={quickSaving} className="btn-primary">
                    {quickSaving ? 'Saving...' : <><Plus size={16} /> Create All Students</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Excel Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Upload Students (Excel)</h2>
                <button onClick={() => setShowUploadModal(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Required columns:</p>
                  <p>Admission Number, First Name, Last Name, Gender, Class, Phone, Parent Name, Parent Phone</p>
                  <p className="mt-2 text-blue-600">Classes must exist in the system (Form 1, Form 2, etc.)</p>
                  <p className="mt-1">You can upload hundreds of students at once. All passwords default to <strong>student123</strong></p>
                </div>
                <div>
                  <label className="label">Excel File</label>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="input-field" />
                </div>
                <div className="flex gap-2">
                  <button onClick={downloadTemplate} className="btn-outline text-sm flex-1 justify-center"><Download size={14} /> Download Template</button>
                  <button onClick={handleBulkUpload} disabled={uploading || !uploadFile} className="btn-primary text-sm flex-1 justify-center">
                    {uploading ? 'Uploading...' : <><Upload size={14} /> Upload Students</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
