import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Upload, Save, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function EnterMarksPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [marks, setMarks] = useState<Record<string, { termMark: number; examMark: number; projectMark: number; teacherRemark: string }>>({});
  const [existingResults, setExistingResults] = useState<Record<string, any>>({});
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/classes').then(r => setClasses(r.data.classes));
    api.get('/subjects').then(r => {
      const allSubs = r.data.subjects || [];
      setAllSubjects(allSubs);
      if (user?.role === 'teacher') {
        const assignedIds = (user as any).assignedSubjects?.map((s: any) => typeof s === 'string' ? s : s._id) || [];
        setSubjects(allSubs.filter((s: any) => assignedIds.includes(s._id)));
      } else {
        setSubjects(allSubs);
      }
    });
    api.get('/academic').then(r => {
      const years = r.data.years || [];
      setAcademicYears(years);
      const active = years.find((y: any) => y.isActive);
      if (active) setSelectedYear(active._id);
    });
  }, [user]);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedYear) {
      api.get(`/students?className=${selectedClass}&limit=500`).then(r => {
        setStudents(r.data.students);
        const m: Record<string, any> = {};
        r.data.students.forEach((s: any) => { m[s._id] = { termMark: 0, examMark: 0, projectMark: 0, teacherRemark: '' }; });
        setMarks(m);
      });
      api.get(`/results?className=${selectedClass}&subject=${selectedSubject}&term=${term}`).then(r => {
        const existing: Record<string, any> = {};
        const m: Record<string, any> = {};
        students.forEach((s: any) => { m[s._id] = { termMark: 0, examMark: 0, projectMark: 0, teacherRemark: '' }; });
        (r.data.results || []).forEach((res: any) => {
          if (res.student?._id) {
            existing[res.student._id] = res;
            m[res.student._id] = {
              termMark: res.termMark || 0, examMark: res.examMark || 0,
              projectMark: res.projectMark || 0, teacherRemark: res.teacherRemark || '',
            };
          }
        });
        setExistingResults(existing);
        setMarks(m);
      });
    }
  }, [selectedClass, selectedSubject, selectedYear, term]);

  const updateMark = (studentId: string, field: string, value: any) => {
    setMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const saveAll = async () => {
    if (!selectedSubject || !selectedClass) return toast.error('Select class and subject');
    const entries = Object.entries(marks).filter(([_, m]) => m.termMark > 0 || m.examMark > 0 || m.projectMark > 0);
    if (entries.length === 0) return toast.error('Enter at least one mark');

    let saved = 0;
    let updated = 0;
    for (const [studentId, m] of entries) {
      const existing = existingResults[studentId];
      if (existing) {
        try {
          await api.put(`/results/${existing._id}`, {
            termMark: m.termMark, examMark: m.examMark,
            projectMark: m.projectMark, teacherRemark: m.teacherRemark,
          });
          updated++;
        } catch { }
      } else {
        try {
          await api.post('/results', {
            student: studentId, subject: selectedSubject, className: selectedClass,
            academicYear: selectedYear, term, termMark: m.termMark, examMark: m.examMark,
            projectMark: m.projectMark, teacherRemark: m.teacherRemark,
          });
          saved++;
        } catch { }
      }
    }
    toast.success(`Saved ${saved} new, updated ${updated} existing results`);
    // Refresh existing results
    api.get(`/results?className=${selectedClass}&subject=${selectedSubject}&term=${term}`).then(r => {
      const existing: Record<string, any> = {};
      (r.data.results || []).forEach((res: any) => {
        if (res.student?._id) existing[res.student._id] = res;
      });
      setExistingResults(existing);
    });
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedSubject || !selectedClass) return toast.error('Select class, subject and file');
    try {
      const arrayBuffer = await uploadFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const res = await api.post('/results/upload-excel', {
        file: uint8Array, subject: selectedSubject, term, className: selectedClass,
      });
      toast.success(`Uploaded ${res.data.created || 0} results`);
      setShowUpload(false); setUploadFile(null);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Upload failed'); }
  };

  const downloadTemplate = () => {
    const className = classes.find(c => c._id === selectedClass)?.name || selectedClass || 'Template';
    const headers = ['Admission Number', 'Student Name', 'Term Mark', 'Exam Mark', 'Project Mark', 'Remarks'];
    const rows = students.map(s => [s.admissionNumber, `${s.firstName} ${s.lastName}`, '', '', '', '']);
    if (rows.length === 0) {
      rows.push(['MLK2026001', 'Tendai Muparutsa', '', '', '', '']);
    }
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    XLSX.writeFile(wb, `Marks_${className.replace(/\s+/g, '_')}.xlsx`);
    toast.success(`Template downloaded with ${rows.length} students`);
  };

  const activeYear = academicYears.find(y => y.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enter Marks</h1>
        <div className="flex gap-2">
          <button onClick={() => { if (!selectedClass) return toast.error('Select a class first'); setShowUpload(true); }} className="btn-secondary text-sm"><Upload size={16} /> Upload Excel</button>
          <button onClick={saveAll} className="btn-primary text-sm"><Save size={16} /> Save All</button>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-4 gap-4">
          <div><label className="label">Class</label><select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select></div>
          <div><label className="label">Subject</label><select className="input-field" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select></div>
          <div><label className="label">Academic Year</label><select className="input-field" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="">Select Year</option>
            {academicYears.map(y => <option key={y._id} value={y._id}>{y.name}</option>)}
          </select></div>
          <div><label className="label">Term</label><select className="input-field" value={term} onChange={e => setTerm(e.target.value)}>
            <option>Term 1</option><option>Term 2</option><option>Term 3</option>
          </select></div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{students.length} students in {classes.find(c => c._id === selectedClass)?.name}</h3>
            <p className="text-sm text-gray-500">Existing results: {Object.keys(existingResults).length}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-3 py-2">Adm No.</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-center">Existing</th>
                  <th className="px-3 py-2">Term Mark</th>
                  <th className="px-3 py-2">Exam Mark</th>
                  <th className="px-3 py-2">Project Mark</th>
                  <th className="px-3 py-2">Final</th>
                  <th className="px-3 py-2">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map(s => {
                  const existing = existingResults[s._id];
                  const m = marks[s._id] || { termMark: 0, examMark: 0, projectMark: 0, teacherRemark: '' };
                  const final = Math.round((m.examMark * 0.8 + m.projectMark * 0.2) * 100) / 100;
                  return (
                    <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 text-sm font-mono">{s.admissionNumber}</td>
                      <td className="px-3 py-2 text-sm">{s.firstName} {s.lastName}</td>
                      <td className="px-3 py-2 text-center">
                        {existing ? <span className="badge badge-success text-xs">{existing.grade || 'Yes'}</span> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-2"><input type="number" min="0" max="100" className="input-field w-20 text-center" value={m.termMark} onChange={e => updateMark(s._id, 'termMark', +e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" min="0" max="100" className="input-field w-20 text-center" value={m.examMark} onChange={e => updateMark(s._id, 'examMark', +e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" min="0" max="100" className="input-field w-20 text-center" value={m.projectMark} onChange={e => updateMark(s._id, 'projectMark', +e.target.value)} /></td>
                      <td className="px-3 py-2 text-sm font-bold">{m.termMark > 0 || m.examMark > 0 || m.projectMark > 0 ? final : '-'}</td>
                      <td className="px-3 py-2"><input className="input-field w-32" value={m.teacherRemark} onChange={e => updateMark(s._id, 'teacherRemark', e.target.value)} placeholder="Remark" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Upload Excel Marks</h2>
                <button onClick={() => setShowUpload(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">How it works:</p>
                  <p>1. Click <strong>Download Template</strong> — it contains the names of all students in the selected class.</p>
                  <p>2. Enter the marks next to each student's name.</p>
                  <p>3. Re-upload the same file.</p>
                </div>
                <div><label className="label">File</label><input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="input-field" /></div>
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
