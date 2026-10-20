import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, X, Megaphone, AlertTriangle, Sun, Trophy, Users, Info, Paperclip, Download, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Attachment {
  url: string; name: string; type: string;
}

interface Notice {
  _id: string; title: string; content: string; category: string; audience: string; recipientIds?: string[];
  priority: string; createdByName?: string; attachment?: Attachment | null; className?: any; isActive: boolean; createdAt: string;
}

const CATEGORIES = ['general', 'holiday', 'sports', 'club', 'emergency'];

const audienceMeta: Record<string, { label: string; cls: string }> = {
  all: { label: 'Everyone', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  students: { label: 'Students only', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' },
  teachers: { label: 'Staff only', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40' },
  form: { label: 'Specific Form', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40' },
  selected: { label: 'Selected people', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40' },
};

const catMeta: Record<string, { label: string; icon: any; cls: string }> = {
  general: { label: 'General', icon: Megaphone, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' },
  holiday: { label: 'Holiday', icon: Sun, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40' },
  sports: { label: 'Sports', icon: Trophy, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40' },
  club: { label: 'Club', icon: Users, cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40' },
  emergency: { label: 'Emergency', icon: AlertTriangle, cls: 'bg-red-100 text-red-700 dark:bg-red-900/40' },
};

function BouncingDots() {
  return <span className="inline-flex items-center gap-1" role="status" aria-label="Saving in progress"><span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" /><span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" /><span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" /></span>;
}

export default function NoticesPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'headmaster' || user?.role === 'finance';
  const [notices, setNotices] = useState<Notice[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [recipientsLoaded, setRecipientsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState<Notice | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', audience: 'all', priority: 'normal', className: '', recipientIds: [] as string[] });

  const fetchNotices = async () => {
    setIsLoadingNotices(true);
    try {
      const r = await api.get(`/notices${category ? `?category=${category}` : ''}`);
      setNotices(r.data.notices || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unable to load notices');
    } finally { setIsLoadingNotices(false); }
  };

  const loadRecipients = async () => {
    if (recipientsLoaded) return;
    try {
      const r = await api.get('/notices/recipients');
      setRecipients(r.data.recipients || []);
      setRecipientsLoaded(true);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Unable to load recipient list'); }
  };
  useEffect(() => {
    fetchNotices();
    api.get('/classes').then(r => setClasses(r.data.classes || [])).catch(() => {});
    // Load the recipient directory only if the publisher chooses targeted delivery.
  }, [category, canManage]);

  const openCreate = () => { setEdit(null); setForm({ title: '', content: '', category: 'general', audience: 'all', priority: 'normal', className: '', recipientIds: [] }); setShowModal(true); };
  const openEdit = (n: Notice) => { setEdit(n); setForm({ title: n.title, content: n.content, category: n.category, audience: n.audience, priority: n.priority, className: (n.className && n.className._id) || n.className || '', recipientIds: n.recipientIds || [] }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return toast.error('Title and content are required');
    if (form.audience === 'form' && !form.className) return toast.error('Select a form/class for this notice');
    if (form.audience === 'selected' && form.recipientIds.length === 0) return toast.error('Select at least one person to receive this notice');
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('content', form.content);
    fd.append('category', form.category);
    fd.append('audience', form.audience);
    fd.append('priority', form.priority);
    if (form.audience === 'form') fd.append('className', form.className);
    if (form.audience === 'selected') fd.append('recipientIds', JSON.stringify(form.recipientIds));
    if (fileRef.current?.files?.[0]) fd.append('file', fileRef.current.files[0]);
    setIsSubmitting(true);
    try {
      if (edit) await api.put(`/notices/${edit._id}`, fd);
      else await api.post('/notices', fd);
      toast.success(edit ? 'Notice updated successfully' : 'Announcement published successfully');
      setShowModal(false);
      if (fileRef.current) fileRef.current.value = '';
      fetchNotices();
    } catch (err: any) { toast.error(err.response?.data?.message || err.message || 'Unable to publish announcement'); }
    finally { setIsSubmitting(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this notice?')) return;
    await api.delete(`/notices/${id}`);
    toast.success('Deleted'); fetchNotices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Notices & Announcements</h1>
          <p className="text-sm text-gray-500">General announcements, holiday notices, sports updates, club activities and emergency notices.</p>
        </div>
        {canManage && <button onClick={openCreate} className="btn-primary"><Plus size={18} /> New Announcement</button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategory('')} className={`badge px-4 py-2 cursor-pointer ${category === '' ? 'badge-danger' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>All</button>
        {CATEGORIES.map(c => {
          const Icon = catMeta[c].icon;
          return (
            <button key={c} onClick={() => setCategory(category === c ? '' : c)} className={`badge px-4 py-2 cursor-pointer ${category === c ? 'badge-danger' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
              <Icon size={14} /> {catMeta[c].label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoadingNotices ? (
          <div className="card col-span-2 flex items-center justify-center gap-3 py-12 text-gray-500"><BouncingDots /> Loading notices…</div>
        ) : notices.length === 0 ? (
          <div className="card col-span-2 text-center text-gray-500 py-12">No notices published yet</div>
        ) : notices.map(n => {
          const meta = catMeta[n.category] || catMeta.general;
          const Icon = meta.icon;
          return (
            <div key={n._id} className={`card ${n.category === 'emergency' ? 'border-red-400 dark:border-red-700' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`p-2 rounded-lg ${meta.cls}`}><Icon size={18} /></span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{n.title}</h3>
                    <p className="text-xs text-gray-400">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${audienceMeta[n.audience]?.cls || audienceMeta.all.cls}`}>
                        {n.audience === 'form' && n.className?.name ? `${n.className.name} only` : audienceMeta[n.audience]?.label || 'Everyone'}
                      </span>
                      {meta.label} {n.priority === 'high' && <span className="badge badge-danger">High Priority</span>} · {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(n)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Edit2 size={15} /></button>
                    <button onClick={() => remove(n._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-line">{n.content}</p>
              {n.attachment && (
                <div className="mt-3">
                  {n.attachment.type?.startsWith('image/') && (
                    <a href={n.attachment.url} target="_blank" rel="noreferrer">
                      <img src={n.attachment.url} alt={n.attachment.name} className="w-full max-h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-90" />
                    </a>
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-2"><Paperclip size={13} /> <span className="truncate">{n.attachment.name}</span></p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={n.attachment.url} target="_blank" rel="noreferrer" className="btn-outline text-xs flex-1 justify-center"><Eye size={14} /> View</a>
                    <a href={n.attachment.url} download={n.attachment.name} className="btn-primary text-xs flex-1 justify-center"><Download size={14} /> Download</a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{edit ? 'Edit Notice' : 'New Announcement'}</h2>
                <button onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Content</label>
                  <textarea className="input-field" rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Category</label>
                    <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{catMeta[c].label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Audience</label>
                    <select className="input-field" value={form.audience} onChange={e => { const audience = e.target.value; setForm({ ...form, audience }); if (audience === 'selected') void loadRecipients(); }}>
                      <option value="all">Everyone</option>
                      <option value="students">Students only</option>
                      <option value="teachers">Staff only</option>
                      <option value="form">Specific Form</option>
                      <option value="selected">Selected people (individuals or group)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Priority</label>
                    <select className="input-field" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                {form.audience === 'form' && (
                  <div>
                    <label className="label">Form / Class</label>
                    <select className="input-field" value={form.className} onChange={e => setForm({ ...form, className: e.target.value })}>
                      <option value="">Select a form</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {form.audience === 'selected' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><label className="label">Choose recipients</label><span className="text-xs text-gray-500">{form.recipientIds.length} selected</span></div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                      {recipients.map(person => {
                        const id = String(person._id);
                        const checked = form.recipientIds.includes(id);
                        return <label key={id} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={e => setForm({ ...form, recipientIds: e.target.checked ? [...form.recipientIds, id] : form.recipientIds.filter(x => x !== id) })} />
                          <span className="flex-1">{person.firstName} {person.lastName} {person.admissionNumber ? '(' + person.admissionNumber + ')' : ''}</span>
                          <span className="text-xs capitalize text-gray-500">{person.role}{person.className ? ' · ' + person.className : ''}</span>
                        </label>;
                      })}
                      {recipients.length === 0 && <p className="p-3 text-sm text-gray-500">Recipient list is loading or empty.</p>}
                    </div>
                    <p className="text-xs text-gray-500">Select one person or several people. Only the selected accounts will see this notice.</p>
                  </div>
                )}
                <div>
                  <label className="label">Attachment (optional)</label>
                  <input ref={fileRef} type="file" className="input-field" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*,video/*,audio/*,.zip" />
                  <p className="text-xs text-gray-400 mt-1">PDF, Word, picture, video, MP3 or ZIP - up to 25MB.{edit && edit.attachment ? ' Existing attachment will be kept unless you choose a new file.' : ''}</p>
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed">{isSubmitting ? <><BouncingDots /> {edit ? 'Saving notice…' : 'Publishing announcement…'}</> : (edit ? 'Update Notice' : 'Publish Announcement')}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
