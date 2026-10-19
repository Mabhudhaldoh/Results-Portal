import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, X, FileText, BookOpen, FileDown, Video, Link2, Presentation, ScrollText, Download, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Resource {
  _id: string; title: string; type: string; subject?: any; description?: string;
  fileUrl?: string; fileName?: string; link?: string; uploadedBy?: any; createdAt: string;
}

const TYPES: Record<string, { label: string; icon: any }> = {
  note: { label: 'Notes', icon: FileText },
  pastpaper: { label: 'Past Exam Papers', icon: ScrollText },
  syllabus: { label: 'Syllabus', icon: BookOpen },
  textbook: { label: 'Textbook', icon: BookOpen },
  video: { label: 'Video', icon: Video },
  pptx: { label: 'PowerPoint', icon: Presentation },
  pdf: { label: 'PDF', icon: FileDown },
  link: { label: 'External Link', icon: Link2 },
};

export default function ResourcesPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'teacher';
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [type, setType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: '', type: 'note', subject: '', description: '', link: '' });

  const fetchResources = () => {
    api.get(`/resources${type ? `?type=${type}` : ''}`).then(r => setResources(r.data.resources || []));
  };
  useEffect(() => {
    fetchResources();
    api.get('/subjects').then(r => setSubjects(r.data.subjects || [])).catch(() => {});
  }, [type]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return toast.error('Title is required');
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('type', form.type);
    if (form.subject) fd.append('subject', form.subject);
    fd.append('description', form.description);
    if (form.type === 'link') {
      if (!form.link) return toast.error('Paste the external link');
      fd.append('link', form.link);
    } else {
      if (!fileRef.current?.files?.[0]) return toast.error('Choose a file to upload');
      fd.append('file', fileRef.current.files[0]);
    }
    setUploading(true);
    try {
      await api.post('/resources', fd);
      toast.success('Resource uploaded');
      setShowModal(false);
      setForm({ title: '', type: 'note', subject: '', description: '', link: '' });
      if (fileRef.current) fileRef.current.value = '';
      fetchResources();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Upload failed'); }
    setUploading(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    await api.delete(`/resources/${id}`);
    toast.success('Deleted'); fetchResources();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Resources</h1>
          <p className="text-sm text-gray-500">Notes, past exam papers, syllabuses, textbooks, videos, presentations, PDFs and external links.</p>
        </div>
        {canManage && <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={18} /> Upload Resource</button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setType('')} className={`badge px-4 py-2 cursor-pointer ${type === '' ? 'badge-danger' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>All</button>
        {Object.entries(TYPES).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <button key={key} onClick={() => setType(type === key ? '' : key)} className={`badge px-4 py-2 cursor-pointer ${type === key ? 'badge-danger' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
              <Icon size={14} /> {meta.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.length === 0 ? (
          <div className="card col-span-full text-center text-gray-500 py-12">No resources found</div>
        ) : resources.map(r => {
          const meta = TYPES[r.type] || TYPES.note;
          const Icon = meta.icon;
          return (
            <div key={r._id} className="card flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <span className={`p-2.5 rounded-lg bg-blue-100 text-mlk-blue dark:bg-blue-900/40`}><Icon size={20} /></span>
                {canManage && (
                  <button onClick={() => remove(r._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={15} /></button>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mt-3">{r.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{meta.label}{r.subject?.name ? ` · ${r.subject.name}` : ''}</p>
              {r.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{r.description}</p>}
              <div className="mt-auto pt-3">
                {r.link ? (
                  <a href={r.link} target="_blank" rel="noreferrer" className="btn-primary w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-sm"><ExternalLink size={15} /> Open Link</a>
                ) : r.fileUrl ? (
                  <a href={r.fileUrl} download={r.fileName} className="btn-primary w-full justify-center text-sm"><Download size={15} /> {r.fileName || 'Download'}</a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Upload Learning Resource</h2>
                <button onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Type</label>
                    <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {Object.entries(TYPES).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Subject (optional)</label>
                    <select className="input-field" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                      <option value="">No subject</option>
                      {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Description (optional)</label>
                  <textarea className="input-field" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                {form.type === 'link' ? (
                  <div>
                    <label className="label">External Link</label>
                    <input className="input-field" type="url" placeholder="https://..." value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} />
                  </div>
                ) : (
                  <div>
                    <label className="label">File</label>
                    <input ref={fileRef} type="file" className="input-field" />
                    <p className="text-xs text-gray-400 mt-1">PDF, Word, PowerPoint, video or image - up to 25MB.</p>
                  </div>
                )}
                <button type="submit" disabled={uploading} className="btn-primary w-full justify-center">{uploading ? 'Uploading...' : 'Upload Resource'}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
