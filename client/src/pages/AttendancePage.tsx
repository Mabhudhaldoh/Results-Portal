import { useState, useEffect } from 'react';
import api from '../services/api';
import { Save, CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [records, setRecords] = useState<Record<string, { daysPresent: number; daysAbsent: number; totalDays: number }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/classes').then(r => setClasses(r.data.classes));
    api.get('/academic').then(r => {
      const years = r.data.years || [];
      setAcademicYears(years);
      const active = years.find((y: any) => y.isActive);
      if (active) setSelectedYear(active._id);
    });
  }, []);

  useEffect(() => {
    if (selectedClass && selectedYear) {
      setLoading(true);
      setStudents([]);
      setRecords({});
      api.get(`/students?className=${selectedClass}&limit=500`).then(r => {
        const list = r.data.students || [];
        setStudents(list);
        const rec: Record<string, any> = {};
        list.forEach((s: any) => { rec[s._id] = { daysPresent: 0, daysAbsent: 0, totalDays: 0 }; });
        api.get(`/attendance?className=${selectedClass}&academicYear=${selectedYear}&term=${term}`).then(res => {
          (res.data.attendance || []).forEach((a: any) => {
            if (a.student?._id) {
              rec[a.student._id] = {
                daysPresent: a.daysPresent || 0,
                daysAbsent: a.daysAbsent || 0,
                totalDays: a.totalDays || 0,
              };
            }
          });
          setRecords(rec);
          setLoading(false);
        }).catch(() => setLoading(false));
      }).catch(() => setLoading(false));
    }
  }, [selectedClass, selectedYear, term]);

  const updateRecord = (studentId: string, field: string, value: number) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const saveAll = async () => {
    if (!selectedClass || !selectedYear) return toast.error('Select a class and academic year');
    setSaving(true);
    try {
      const recordsArr = students.map(s => ({
        student: s._id,
        className: selectedClass,
        stream: s.stream?._id || s.stream || '',
        daysPresent: records[s._id]?.daysPresent || 0,
        daysAbsent: records[s._id]?.daysAbsent || 0,
        totalDays: records[s._id]?.totalDays || 0,
      }));
      const res = await api.post('/attendance/bulk', { academicYear: selectedYear, term, records: recordsArr });
      toast.success(`Attendance saved for ${res.data.saved} students`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    }
    setSaving(false);
  };

  const totalDays = records[students[0]?._id]?.totalDays || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
        <button onClick={saveAll} disabled={saving || students.length === 0} className="btn-primary text-sm"><Save size={16} /> {saving ? 'Saving...' : 'Save All'}</button>
      </div>

      <div className="card">
        <div className="grid grid-cols-4 gap-4">
          <div><label className="label">Class</label><select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select></div>
          <div><label className="label">Academic Year</label><select className="input-field" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="">Select Year</option>
            {academicYears.map(y => <option key={y._id} value={y._id}>{y.name}</option>)}
          </select></div>
          <div><label className="label">Term</label><select className="input-field" value={term} onChange={e => setTerm(e.target.value)}>
            <option>Term 1</option><option>Term 2</option><option>Term 3</option>
          </select></div>
          <div className="flex items-end">
            {totalDays > 0 && <p className="text-sm text-gray-500"><CalendarCheck size={14} className="inline mr-1" />Term days: {totalDays}</p>}
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{students.length} students in {classes.find(c => c._id === selectedClass)?.name}</h3>
            <p className="text-sm text-gray-500">Enter days present, days absent and total school days for {term}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-3 py-2">Adm No.</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-center">Days Present</th>
                  <th className="px-3 py-2 text-center">Days Absent</th>
                  <th className="px-3 py-2 text-center">Total Days</th>
                  <th className="px-3 py-2 text-center">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  [...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td colSpan={6} className="px-3 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div></td></tr>)
                ) : (
                  students.map(s => {
                    const rec = records[s._id] || { daysPresent: 0, daysAbsent: 0, totalDays: 0 };
                    const pct = rec.totalDays > 0 ? Math.round((rec.daysPresent / rec.totalDays) * 100) : 0;
                    return (
                      <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-sm font-mono">{s.admissionNumber}</td>
                        <td className="px-3 py-2 text-sm">{s.firstName} {s.lastName}</td>
                        <td className="px-3 py-2 text-center"><input type="number" min="0" className="input-field w-20 text-center" value={rec.daysPresent} onChange={e => updateRecord(s._id, 'daysPresent', +e.target.value)} /></td>
                        <td className="px-3 py-2 text-center"><input type="number" min="0" className="input-field w-20 text-center" value={rec.daysAbsent} onChange={e => updateRecord(s._id, 'daysAbsent', +e.target.value)} /></td>
                        <td className="px-3 py-2 text-center"><input type="number" min="0" className="input-field w-20 text-center" value={rec.totalDays} onChange={e => updateRecord(s._id, 'totalDays', +e.target.value)} /></td>
                        <td className="px-3 py-2 text-center">
                          <span className={`badge ${pct >= 85 ? 'badge-success' : pct >= 70 ? 'badge-warning' : 'badge-danger'}`}>{pct}%</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
