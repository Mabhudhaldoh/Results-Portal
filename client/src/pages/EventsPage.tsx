import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, X, CalendarDays, MapPin, Clock, Paperclip, Download, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Attachment {
  url: string; name: string; type: string;
}

interface EventItem {
  _id: string; title: string; description?: string; date: string; time?: string;
  location?: string; category?: string; audience?: string; recipientIds?: string[]; attachment?: Attachment | null; createdAt: string;
}

const CATEGORIES = ['academic', 'sports', 'holiday', 'club', 'other'];

export default function EventsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'headmaster' || user?.role === 'finance';
  const [events, setEvents] = useState<EventItem[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState<EventItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: '', description: '', date: '', time: '', location: '', category: 'academic', audience: 'all', recipientIds: [] as string[] });

  const today = new Date();

  const fetchEvents = () => {
    api.get(`/events${view === 'upcoming' ? '?upcoming=true' : ''}`).then(r => {
      let list: EventItem[] = r.data.events || [];
      if (view === 'past') list = list.filter(e => new Date(e.date) < today);
      setEvents(list);
    });
  };
  useEffect(() => {
    fetchEvents();
    if (canManage) api.get('/events/recipients').then(r => setRecipients(r.data.recipients || [])).catch(() => toast.error('Unable to load recipient list'));
  }, [view, canManage]);

  const openCreate = () => { setEdit(null); setForm({ title: '', description: '', date: '', time: '', location: '', category: 'academic', audience: 'all', recipientIds: [] }); setShowModal(true); };
  const openEdit = (ev: EventItem) => { setEdit(ev); setForm({ title: ev.title, description: ev.description || '', date: ev.date?.slice(0, 10) || '', time: ev.time || '', location: ev.location || '', category: ev.category || 'academic', audience: ev.audience || 'all', recipientIds: ev.recipientIds || [] }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) return toast.error('Title and date are required');
    if (form.audience === 'selected' && form.recipientIds.length === 0) return toast.error('Select at least one person for this event');
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('date', form.date);
    fd.append('time', form.time);
    fd.append('location', form.location);
    fd.append('category', form.category);
    fd.append('audience', form.audience);
    if (form.audience === 'selected') fd.append('recipientIds', JSON.stringify(form.recipientIds));
    if (fileRef.current?.files?.[0]) fd.append('file', fileRef.current.files[0]);
    try {
      if (edit) await api.put(`/events/${edit._id}`, fd);
      else await api.post('/events', fd);
      toast.success(edit ? 'Event updated' : 'Event added to calendar');
      setShowModal(false);
      if (fileRef.current) fileRef.current.value = '';
      fetchEvents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    await api.delete(`/events/${id}`);
    toast.success('Deleted'); fetchEvents();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Calendar & Events</h1>
          <p className="text-sm text-gray-500">Upcoming academic, sports, holiday and club events.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(view === 'upcoming' ? 'past' : 'upcoming')} className="btn-primary bg-slate-600 hover:bg-slate-700"><CalendarDays size={16} /> {view === 'upcoming' ? 'View Past' : 'View Upcoming'}</button>
          {canManage && <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Add Event</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length === 0 ? (
          <div className="card col-span-full text-center text-gray-500 py-12">No events found</div>
        ) : events.map(ev => (
          <div key={ev._id} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="badge badge-info">{ev.category}</span>
              {canManage && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(ev)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Edit2 size={15} /></button>
                  <button onClick={() => remove(ev._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={15} /></button>
                </div>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{ev.title}</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p className="flex items-center gap-2 font-semibold text-mlk-blue"><CalendarDays size={15} /> {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              {ev.time && <p className="flex items-center gap-2"><Clock size={15} /> {ev.time}</p>}
              {ev.location && <p className="flex items-center gap-2"><MapPin size={15} /> {ev.location}</p>}
            </div>
            {ev.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{ev.description}</p>}
            {ev.attachment && (
              <div className="mt-3">
                {ev.attachment.type?.startsWith('image/') && (
                  <a href={ev.attachment.url} target="_blank" rel="noreferrer">
                    <img src={ev.attachment.url} alt={ev.attachment.name} className="w-full max-h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-90" />
                  </a>
                )}
                <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-2"><Paperclip size={13} /> <span className="truncate">{ev.attachment.name}</span></p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={ev.attachment.url} target="_blank" rel="noreferrer" className="btn-outline text-xs flex-1 justify-center"><Eye size={14} /> View</a>
                  <a href={ev.attachment.url} download={ev.attachment.name} className="btn-primary text-xs flex-1 justify-center"><Download size={14} /> Download</a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{edit ? 'Edit Event' : 'Add Event'}</h2>
                <button onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Event Title</label>
                  <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Date</label><input type="date" className="input-field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
                  <div><label className="label">Time</label><input type="time" className="input-field" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Location</label>
                    <input className="input-field" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Who can see this event?</label>
                  <select className="input-field" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value, recipientIds: e.target.value === 'selected' ? form.recipientIds : [] })}>
                    <option value="all">Everyone</option><option value="students">Students only</option><option value="teachers">Staff only</option><option value="selected">Selected people (individuals or group)</option>
                  </select>
                </div>
                {form.audience === 'selected' && <div className="space-y-2">
                  <div className="flex items-center justify-between"><label className="label">Choose recipients</label><span className="text-xs text-gray-500">{form.recipientIds.length} selected</span></div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                    {recipients.map(person => { const id = String(person._id); const checked = form.recipientIds.includes(id); return <label key={id} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm cursor-pointer"><input type="checkbox" checked={checked} onChange={e => setForm({ ...form, recipientIds: e.target.checked ? [...form.recipientIds, id] : form.recipientIds.filter(x => x !== id) })} /><span className="flex-1">{person.firstName} {person.lastName} {person.admissionNumber ? '(' + person.admissionNumber + ')' : ''}</span><span className="text-xs capitalize text-gray-500">{person.role}</span></label>; })}
                    {recipients.length === 0 && <p className="p-3 text-sm text-gray-500">Recipient list is loading or empty.</p>}
                  </div>
                  <p className="text-xs text-gray-500">Choose one or more accounts. Only selected people can see this event.</p>
                </div>}
                <div>
                  <label className="label">Attachment (optional)</label>
                  <input ref={fileRef} type="file" className="input-field" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*,video/*,audio/*,.zip" />
                  <p className="text-xs text-gray-400 mt-1">PDF, Word, picture, video, MP3 or ZIP - up to 25MB.{edit && edit.attachment ? ' Existing attachment will be kept unless you choose a new file.' : ''}</p>
                </div>
                <button type="submit" className="btn-primary w-full justify-center">{edit ? 'Update' : 'Add Event'}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
