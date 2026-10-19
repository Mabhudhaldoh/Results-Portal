import { useState, useEffect } from 'react';
import api from '../services/api';
import { UserPlus, CheckCircle, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Teacher {
  _id: string; firstName: string; lastName: string; employeeNumber: string;
  assignedClasses: any[]; assignedSubjects: any[]; assignedStudents?: string[];
}

interface Student {
  _id: string; firstName: string; lastName: string; admissionNumber: string;
  className: { _id: string; name: string } | null;
}

export default function AssignTeacherPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/teachers'),
      api.get('/classes'),
      api.get('/subjects'),
    ]).then(([t, c, s]) => {
      setTeachers(t.data.teachers);
      setClasses(c.data.classes);
      setSubjects(s.data.subjects);
      setLoading(false);
    });
  }, []);

  const currentTeacher = teachers.find(t => t._id === selectedTeacher);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    api.get(`/students?className=${selectedClass}`).then(res => {
      const studs = res.data.students;
      setStudents(studs);
      if (selectAll && currentTeacher) {
        const teacherStudentIds = currentTeacher.assignedStudents || [];
        const classStudentIds = studs.map((s: Student) => s._id);
        if (teacherStudentIds.length > 0) {
          setSelectedStudents(classStudentIds.filter((id: string) => teacherStudentIds.includes(id)));
        } else {
          setSelectedStudents(classStudentIds);
        }
      }
    });
  }, [selectedClass, selectedTeacher]);

  useEffect(() => {
    if (currentTeacher) {
      setSelectedSubjects(currentTeacher.assignedSubjects?.map((s: any) => s._id) || []);
      setSelectedStudents(currentTeacher.assignedStudents || []);
      setSelectAll(!currentTeacher.assignedStudents || currentTeacher.assignedStudents.length === 0);
    } else {
      setSelectedSubjects([]);
      setSelectedStudents([]);
      setSelectAll(true);
    }
  }, [selectedTeacher]);

  const filteredStudents = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q);
  });

  const toggleStudent = (id: string) => {
    setSelectAll(false);
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleAllStudents = () => {
    if (selectAll) {
      setSelectedStudents([]);
      setSelectAll(false);
    } else {
      setSelectedStudents(students.map(s => s._id));
      setSelectAll(true);
    }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!selectedTeacher) { toast.error('Select a teacher'); return; }
    try {
      const classIds = [...new Set([...(currentTeacher?.assignedClasses?.map((c: any) => c._id) || []), ...(selectedClass ? [selectedClass] : [])])];
      await api.put(`/users/${selectedTeacher}/assign-classes`, { classes: classIds, classTeacher: null });
      await api.put(`/users/${selectedTeacher}/assign-subjects`, { subjects: selectedSubjects });
      await api.put(`/users/${selectedTeacher}/assign-students`, { students: selectedStudents });
      toast.success('Assignment saved');
    } catch (err: any) { toast.error(err.message || 'Error saving assignment'); }
  };

  if (loading) return <div className="space-y-6"><div className="card animate-pulse"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UserPlus size={24} /> Assign Teacher
        </h1>
        <button onClick={handleSave} className="btn-primary">
          <CheckCircle size={18} /> Save Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <label className="label">Select Teacher</label>
            <select className="input-field" value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
              <option value="">Choose a teacher</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>{t.firstName} {t.lastName} ({t.employeeNumber})</option>
              ))}
            </select>
            {currentTeacher && (
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                <p>Assigned Classes: {currentTeacher.assignedClasses?.length || 0}</p>
                <p>Assigned Subjects: {currentTeacher.assignedSubjects?.length || 0}</p>
              </div>
            )}
          </div>

          <div className="card">
            <label className="label">Select Class</label>
            <select className="input-field" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Choose a class</option>
              {classes.map((c: any) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="card">
            <label className="label mb-3">Assign Subjects</label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {subjects.map((s: any) => (
                <label key={s._id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={selectedSubjects.includes(s._id)} onChange={() => toggleSubject(s._id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="input-field pl-10" />
              </div>
              {students.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input type="checkbox" checked={selectAll} onChange={toggleAllStudents}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  Select All ({students.length})
                </label>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedStudents.length} selected
              </span>
            </div>

            {!selectedClass ? (
              <p className="text-center py-12 text-gray-500">Select a class to view students</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-center py-12 text-gray-500">No students found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3 w-10"></th>
                      <th className="px-4 py-3">Adm No.</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredStudents.map(s => (
                      <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => toggleStudent(s._id)}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedStudents.includes(s._id)} onChange={() => toggleStudent(s._id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" onClick={e => e.stopPropagation()} />
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">{s.admissionNumber}</td>
                        <td className="px-4 py-3 text-sm font-medium">{s.firstName} {s.lastName}</td>
                        <td className="px-4 py-3 text-sm">{s.className?.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
