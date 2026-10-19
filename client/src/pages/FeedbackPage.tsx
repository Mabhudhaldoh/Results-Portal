import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function FeedbackPage() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ teacherId: '', subject: '', message: '', priority: 'normal' });

  const fetchFeedback = () => {
    const url = user?.role === 'teacher' ? `/feedback?teacherId=${user.id || (user as any)._id}` : '/feedback';
    api.get(url).then(res => { setFeedback(res.data.feedback || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchFeedback();
    if (user?.role === 'headmaster') {
      api.get('/teachers').then(r => setTeachers(r.data.teachers || []));
    }
  }, [user]);

  const handleSend = async () => {
    if (!form.teacherId || !form.message) return toast.error('Select teacher and enter message');
    try {
      await api.post('/feedback', form);
      toast.success('Feedback sent');
      setShowCompose(false);
      setForm({ teacherId: '', subject: '', message: '', priority: 'normal' });
      fetchFeedback();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const markRead = async (id: string) => {
    await api.put(`/feedback/${id}/read`);
    fetchFeedback();
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm('Delete this feedback?')) return;
    await api.delete(`/feedback/${id}`);
    toast.success('Deleted');
    fetchFeedback();
  };

  const priorityColor = (p: string) => {
    const map: Record<string, string> = { urgent: 'text-red-600 bg-red-50 dark:bg-red-900/30', high: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30', normal: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', low: 'text-gray-600 bg-gray-50 dark:bg-gray-800' };
    return map[p] || map.normal;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user?.role === 'headmaster' ? 'Feedback to Teachers' : 'My Feedback'}
          </h1>
          <p className="text-sm text-gray-500">
            {user?.role === 'headmaster' ? 'Send comments and feedback to teachers about student performance' : 'View feedback from the Headmaster'}
          </p>
        </div>
        {user?.role === 'headmaster' && (
          <button onClick={() => setShowCompose(true)} className="btn-primary"><MessageSquare size={16} /> New Feedback</button>
        )}
      </div>

      {loading ? (
        <div className="card animate-pulse h-40"></div>
      ) : feedback.length === 0 ? (
        <div className="card text-center py-12">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedback.map(fb => (
            <div key={fb._id} className={`card border-l-4 ${fb.read ? 'border-gray-300' : 'border-mlk-red'} ${!fb.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(fb.priority)}`}>
                      {(fb.priority || 'normal').toUpperCase()}
                    </span>
                    {!fb.read && <span className="w-2 h-2 bg-mlk-red rounded-full"></span>}
                    <span className="text-xs text-gray-400">{new Date(fb.createdAt).toLocaleDateString()} {new Date(fb.createdAt).toLocaleTimeString()}</span>
                  </div>
                  {fb.subject && <p className="font-semibold text-sm mb-1">{fb.subject}</p>}
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{fb.message}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {user?.role === 'teacher' && !fb.read && (
                    <button onClick={() => markRead(fb._id)} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg text-green-600" title="Mark as read">
                      <Check size={16} />
                    </button>
                  )}
                  {user?.role === 'headmaster' && (
                    <button onClick={() => deleteFeedback(fb._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-red-600" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCompose && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCompose(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">New Feedback</h2>
                <button onClick={() => setShowCompose(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">To Teacher</label>
                  <select className="input-field" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} required>
                    <option value="">Select Teacher</option>
                    {teachers.map((t: any) => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Subject</label>
                  <input className="input-field" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Performance feedback on Term 2 results" />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input-field" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="label">Message</label>
                  <textarea className="input-field" rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Enter your feedback/comments..." required />
                </div>
                <button onClick={handleSend} className="btn-primary w-full justify-center"><Send size={16} /> Send Feedback</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
