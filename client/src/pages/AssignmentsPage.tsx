import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Paperclip, Download, CalendarDays, CheckCircle2, Clock, AlertTriangle, ClipboardList, Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Assignment {
  _id: string; title: string; description?: string; subject?: any; className?: any; stream?: any;
  dueDate: string; attachments?: { fileUrl: string; fileName: string }[];
  createdBy?: any; submissionCount?: number; mySubmission?: any; createdAt: string;
}

interface Submission {
  _id: string; assignment: any; student: any; content?: string;
  attachments?: { fileUrl: string; fileName: string }[];
  submittedAt: string; isLate: boolean; mark?: number; feedback?: string; status: string;
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const canCreate = role === 'admin' || role === 'teacher';
  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: '', description: '', subject: '', className: '', stream: '', dueDate: '' });

  const [selected, setSelected] = useState<Assignment | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [grades, setGrades] = useState<Record<string, { mark: string; feedback: string }>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitContent, setSubmitContent] = useState('');
  const submitFileRef = useRef<HTMLInputElement>(null);

  const fetchAssignments = () => {
    const url = isTeacher ? '/assignments?mine=true' : '/assignments';
    api.get(url).then(r => setAssignments(r.data.assignments || []));
  };

  useEffect(() => {
    fetchAssignments();
    api.get('/subjects').then(r => setSubjects(r.data.subjects || [])).catch(() => {});
    api.get('/classes').then(r => setClasses(r.data.classes || [])).catch(() => {});
    api.get('/classes/streams/all').then(r => setStreams(r.data.streams || [])).catch(() => {});
  }, []);

  const openDetail = async (a: Assignment) => {
    setSelected(a);
    setSubmissions([]);
    setGrades({});
    try {
      const d = await api.get(`/assignments/${a._id}`);
      setDetail(d.data.assignment);
      const s = await api.get(`/submissions?assignment=${a._id}`);
      setSubmissions(s.data.submissions || []);
      const g: Record<string, { mark: string; feedback: string }> = {};
      (s.data.submissions || []).forEach((sub: Submission) => {
        g[sub._id] = { mark: sub.mark != null ? String(sub.mark) : '', feedback: sub.feedback || '' };
      });
      setGrades(g);
    } catch { toast.error('Failed to load submissions'); }
  };

  const openCreate = () => { setEdit(null); setForm({ title: '', description: '', subject: '', className: '', stream: '', dueDate: '' }); setShowModal(true); };
  const openEdit = (a: Assignment) => {
    setEdit(a);
    setForm({
      title: a.title, description: a.description || '', subject: a.subject?._id || '',
      className: a.className?._id || '', stream: a.stream?._id || '',
      dueDate: a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.subject || !form.dueDate) return toast.error('Title, subject and due date are required');
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('subject', form.subject);
    fd.append('className', form.className || '');
    fd.append('stream', form.stream || '');
    fd.append('dueDate', new Date(form.dueDate).toISOString());
    if (fileRef.current?.files) {
      Array.from(fileRef.current.files).forEach(f => fd.append('files', f));
    }
    setSaving(true);
    try {
      if (edit) await api.put(`/assignments/${edit._id}`, fd);
      else await api.post('/assignments', fd);
      toast.success(edit ? 'Assignment updated' : 'Assignment shared with students');
      setShowModal(false);
      if (fileRef.current) fileRef.current.value = '';
      fetchAssignments();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error saving assignment'); }
    setSaving(false);
  };

  const removeAssignment = async (a: Assignment) => {
    if (!confirm(`Delete assignment "${a.title}"?`)) return;
    await api.delete(`/assignments/${a._id}`);
    toast.success('Assignment deleted');
    if (selected?._id === a._id) setSelected(null);
    fetchAssignments();
  };

  const gradeSubmission = async (sub: Submission) => {
    const g = grades[sub._id];
    if (!g || g.mark === '') return toast.error('Enter a mark');
    await api.put(`/submissions/${sub._id}/grade`, { mark: Number(g.mark), feedback: g.feedback });
    toast.success('Marked and feedback sent to student');
    if (selected) openDetail(selected);
  };

  const submitWork = async (a: Assignment) => {
    if (!submitContent.trim() && !submitFileRef.current?.files?.[0]) return toast.error('Add your work or upload a file');
    const fd = new FormData();
    fd.append('assignment', a._id);
    fd.append('content', submitContent);
    if (submitFileRef.current?.files) {
      Array.from(submitFileRef.current.files).forEach(f => fd.append('files', f));
    }
    setSubmitting(true);
    try {
      await api.post('/submissions', fd);
      toast.success('Completed work submitted');
      setSubmitContent('');
      if (submitFileRef.current) submitFileRef.current.value = '';
      fetchAssignments();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Submission failed'); }
    setSubmitting(false);
  };

  const dueInfo = (a: Assignment) => {
    const due = new Date(a.dueDate);
    const now = new Date();
    const overdue = due < now;
    return { due, overdue, daysLeft: Math.ceil((due.getTime() - now.getTime()) / 86400000) };
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isStudent ? 'Homework & Assignments' : 'Assignments'}
          </h1>
          <p className="text-sm text-gray-500">
            {isStudent ? 'Complete and submit your work before the due date. View teacher feedback and marks awarded.' : 'Share homework and assignments with students, then mark their submitted work.'}
          </p>
        </div>
        {canCreate && <button onClick={openCreate} className="btn-primary"><Plus size={18} /> New Assignment</button>}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {assignments.length === 0 ? (
          <div className="card text-center text-gray-500 py-12">No assignments yet{canCreate && ' - create one to share with your students'}</div>
        ) : assignments.map(a => {
          const { due, overdue } = dueInfo(a);
          const ms = a.mySubmission;
          return (
            <div key={a._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="p-2.5 rounded-lg bg-blue-100 text-mlk-blue dark:bg-blue-900/40"><ClipboardList size={20} /></span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{a.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {a.subject?.name || 'General'}
                      {a.className ? ` · ${a.className?.name || ''}` : ''}
                      {a.stream?.name ? ` ${a.stream.name}` : ''}
                      {canCreate && a.submissionCount != null && ` · ${a.submissionCount} submission(s)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${overdue ? 'badge-danger' : 'badge-info'}`}>
                    <CalendarDays size={13} /> Due {fmt(a.dueDate)} {overdue && '(overdue)'}
                  </span>
                  {canCreate && (
                    <>
                      <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Edit"><Paperclip size={16} /></button>
                      <button onClick={() => removeAssignment(a)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600" title="Delete"><X size={16} /></button>
                    </>
                  )}
                </div>
              </div>

              {a.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-line">{a.description}</p>}

              {a.attachments && a.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {a.attachments.map((att, i) => (
                    <a key={i} href={att.fileUrl} download={att.fileName} className="badge badge-info hover:opacity-75"><Download size={13} /> {att.fileName}</a>
                  ))}
                </div>
              )}

              {canCreate && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => openDetail(a)} className="btn-primary bg-slate-600 hover:bg-slate-700 text-sm">
                    View Submissions {detail?._id === a._id && detail.lateCount > 0 ? `(${detail.lateCount} late)` : ''}
                  </button>
                </div>
              )}

              {isStudent && (
                <div className="mt-4 border-t pt-4">
                  {ms ? (
                    <div className={`p-4 rounded-lg ${ms.isLate ? 'bg-red-50 dark:bg-red-900/20 border border-red-300' : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300'}`}>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {ms.isLate
                          ? <span className="badge badge-danger"><AlertTriangle size={13} /> Late Submission</span>
                          : <span className="badge badge-success"><CheckCircle2 size={13} /> Submitted on time</span>}
                        <span className="text-sm text-gray-500">Submitted {new Date(ms.submittedAt).toLocaleString()}</span>
                      </div>
                      {ms.mark != null && (
                        <p className="text-sm"><span className="font-semibold text-gray-800 dark:text-gray-200">Mark Awarded:</span> <span className="font-bold text-mlk-blue">{ms.mark} / 20</span></p>
                      )}
                      {ms.feedback && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1"><MessageSquare size={14} className="inline mr-1" /><span className="font-semibold">Teacher Feedback:</span> {ms.feedback}</p>
                      )}
                      {ms.mark == null && <p className="text-xs text-gray-400 mt-1">Awaiting marking by your teacher.</p>}
                      <button onClick={() => { setSubmitContent(ms.content || ''); }} className="btn-primary bg-slate-600 hover:bg-slate-700 mt-3 text-sm">Edit / Resubmit</button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Submit your completed work:</p>
                      <textarea className="input-field" rows={2} placeholder="Type your answer or a short note about the attached file..." value={submitContent} onChange={e => setSubmitContent(e.target.value)} />
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <input ref={submitFileRef} type="file" multiple className="input-field w-auto" />
                        <button onClick={() => submitWork(a)} disabled={submitting} className="btn-primary text-sm"><Send size={15} /> {submitting ? 'Submitting...' : 'Submit Work'}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected && canCreate && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white">Submissions for: {selected.title}</h2>
            <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
          </div>
          {detail && (detail.lateCount > 0 || detail.submissionCount > 0) && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="badge badge-info">{detail.submissionCount} submitted</span>
              <span className="badge badge-success">{detail.gradedCount} marked</span>
              {detail.lateCount > 0 && <span className="badge badge-danger"><AlertTriangle size={13} /> {detail.lateCount} late submission(s) - notification required</span>}
            </div>
          )}
          {submissions.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No submissions yet for this assignment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Late?</th>
                    <th className="px-4 py-3">Work</th>
                    <th className="px-4 py-3">Mark (out of 20)</th>
                    <th className="px-4 py-3">Feedback</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {submissions.map(s => (
                    <tr key={s._id}>
                      <td className="px-4 py-3 text-sm font-medium">{s.student?.firstName} {s.student?.lastName}<br /><span className="text-xs text-gray-400 font-mono">{s.student?.admissionNumber}</span></td>
                      <td className="px-4 py-3 text-sm">{new Date(s.submittedAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{s.isLate ? <span className="badge badge-danger">Late</span> : <span className="badge badge-success">On time</span>}</td>
                      <td className="px-4 py-3 text-sm max-w-[180px]">
                        {s.content && <p className="truncate">{s.content}</p>}
                        {s.attachments?.map((att, i) => (
                          <a key={i} href={att.fileUrl} download={att.fileName} className="flex items-center gap-1 text-mlk-blue hover:underline text-xs mt-1"><Download size={12} /> {att.fileName}</a>
                        ))}
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min={0} max={20} className="input-field w-20" value={grades[s._id]?.mark || ''} onChange={e => setGrades({ ...grades, [s._id]: { ...grades[s._id], mark: e.target.value } })} placeholder="-" />
                      </td>
                      <td className="px-4 py-3">
                        <input className="input-field" value={grades[s._id]?.feedback || ''} onChange={e => setGrades({ ...grades, [s._id]: { ...grades[s._id], feedback: e.target.value } })} placeholder="Feedback..." />
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => gradeSubmission(s)} className="btn-primary text-sm"><CheckCircle2 size={15} /> Mark</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{edit ? 'Edit Assignment' : 'New Assignment'}</h2>
                <button onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. History Essay - Cold War" required />
                </div>
                <div>
                  <label className="label">Instructions</label>
                  <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What should students do?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Subject</label>
                    <select className="input-field" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required>
                      <option value="">Select subject</option>
                      {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Due Date</label>
                    <input type="datetime-local" className="input-field" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Class (optional)</label>
                    <select className="input-field" value={form.className} onChange={e => setForm({ ...form, className: e.target.value, stream: '' })}>
                      <option value="">All classes</option>
                      {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Stream (optional)</label>
                    <select className="input-field" value={form.stream} onChange={e => setForm({ ...form, stream: e.target.value })} disabled={!form.className}>
                      <option value="">All streams</option>
                      {streams.filter((s: any) => !form.className || s.className?._id === form.className || s.className === form.className).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Attachments (optional)</label>
                  <input ref={fileRef} type="file" multiple className="input-field" />
                  {edit && edit.attachments && edit.attachments.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">Current files: {edit.attachments.map(a => a.fileName).join(', ')}. New files will be added.</p>
                  )}
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Saving...' : edit ? 'Update Assignment' : 'Share Assignment'}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
