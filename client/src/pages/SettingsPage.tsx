import { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings as SettingsIcon, Save, DollarSign, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    schoolName: '', schoolMotto: '', schoolAddress: '', schoolPhone: '',
    schoolEmail: '', schoolWebsite: '', headmasterName: '',
    termWeight: 30, examWeight: 50, projectWeight: 20,
    defaultFeesRequired: 500,
    feesViewPercentage: 50,
    feesBlockingEnabled: true,
    resultsVisibilityEnabled: false,
    resultsVisibilityFrom: '',
    resultsVisibilityTo: '',
  });

  useEffect(() => {
    api.get('/settings').then(res => {
      const s = res.data.settings;
      setSettings(s);
      const v = s.resultsVisibility || {};
      setForm({
        schoolName: s.schoolName || '', schoolMotto: s.schoolMotto || '',
        schoolAddress: s.schoolAddress || '', schoolPhone: s.schoolPhone || '',
        schoolEmail: s.schoolEmail || '', schoolWebsite: s.schoolWebsite || '',
        headmasterName: s.headmasterName || '',
        termWeight: s.termWeight || 30, examWeight: s.examWeight || 50, projectWeight: s.projectWeight || 20,
        defaultFeesRequired: s.defaultFeesRequired || 500,
        feesViewPercentage: s.feesViewPercentage || 50,
        feesBlockingEnabled: s.feesBlockingEnabled !== false,
        resultsVisibilityEnabled: v.enabled === true,
        resultsVisibilityFrom: toLocalInput(v.from) || '',
        resultsVisibilityTo: toLocalInput(v.to) || '',
      });
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    try {
      await api.put('/settings', {
        ...form,
        resultsVisibility: {
          enabled: form.resultsVisibilityEnabled,
          from: form.resultsVisibilityFrom || null,
          to: form.resultsVisibilityTo || null,
        },
      });
      toast.success('Settings saved');
    } catch (err: any) { toast.error(err.response?.data?.message); }
  };

  const quickSetWindow = (hours: number) => {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 3600 * 1000);
    setForm(f => ({ ...f, resultsVisibilityEnabled: true, resultsVisibilityFrom: toLocalInput(now.toISOString()), resultsVisibilityTo: toLocalInput(end.toISOString()) }));
  };

  if (loading) return <div className="card animate-pulse h-64"></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Settings</h1>
        <button onClick={handleSave} className="btn-primary"><Save size={18} /> Save Changes</button>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><SettingsIcon size={18} /> School Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">School Name</label><input className="input-field" value={form.schoolName} onChange={e => setForm({ ...form, schoolName: e.target.value })} /></div>
          <div><label className="label">Motto</label><input className="input-field" value={form.schoolMotto} onChange={e => setForm({ ...form, schoolMotto: e.target.value })} /></div>
        </div>
        <div><label className="label">Address</label><input className="input-field" value={form.schoolAddress} onChange={e => setForm({ ...form, schoolAddress: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Phone</label><input className="input-field" value={form.schoolPhone} onChange={e => setForm({ ...form, schoolPhone: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input-field" type="email" value={form.schoolEmail} onChange={e => setForm({ ...form, schoolEmail: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Website</label><input className="input-field" value={form.schoolWebsite} onChange={e => setForm({ ...form, schoolWebsite: e.target.value })} /></div>
          <div><label className="label">Headmaster Name</label><input className="input-field" value={form.headmasterName} onChange={e => setForm({ ...form, headmasterName: e.target.value })} /></div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">Grade Mark Composition</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-mlk-blue">100%</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Exam Mark (final)</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-emerald-600">Reference</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Term Mark (except Term 1 special classes)</p>
          </div>
        </div>
        <p className="text-sm text-gray-500">For Term 2 and Term 3, and for Form 4 / Upper Six in Term 1, the Examination Mark alone determines the final percentage.</p>
        <p className="text-sm text-gray-500">For Form 1, Form 2, Form 3 and Lower Six in Term 1, the Term Mark is used as the final mark because no examination is written. Project marks are recorded for reference only.</p>
      </div>
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><DollarSign size={18} /> Fees Configuration</h2>
        <div><label className="label">Default Fees Required Per Student ($)</label><input type="number" className="input-field" value={form.defaultFeesRequired} onChange={e => setForm({ ...form, defaultFeesRequired: +e.target.value })} /></div>
        <p className="text-sm text-gray-500">This is the default fees amount shown when adding new students. Individual student fees can be overridden in the Students page.</p>
        <div className="border-t pt-4 mt-2">
          <h3 className="font-semibold mb-3">Student Result Access (Fees Blocking)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Automatic Results Access Threshold</label>
              <p className="text-sm font-semibold text-mlk-blue">$100 fees balance or less</p>
              <p className="text-xs text-gray-500 mt-1">When fees blocking is enabled, students with balances above $100 need Finance approval first and then the Headmaster's individual approval.</p>
            </div>
            <div>
              <label className="label">Enable Fees Blocking</label>
              <div className="flex items-center gap-3 mt-2">
                <button type="button" onClick={() => setForm(f => ({ ...f, feesBlockingEnabled: !f.feesBlockingEnabled }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.feesBlockingEnabled ? 'bg-mlk-red' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.feesBlockingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-medium">{form.feesBlockingEnabled ? 'Enabled - Balances above $100 are blocked unless approved' : 'Disabled - All students can view results'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarClock size={18} /> Results Publish Window</h2>
        <p className="text-sm text-gray-500">Students can only view published results and report cards inside this window. Outside the window their results are automatically hidden (staff still see everything).</p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setForm(f => ({ ...f, resultsVisibilityEnabled: !f.resultsVisibilityEnabled }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.resultsVisibilityEnabled ? 'bg-mlk-red' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.resultsVisibilityEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-medium">{form.resultsVisibilityEnabled ? 'Enabled - Results auto-hide outside the window' : 'Disabled - Results stay visible once published'}</span>
        </div>
        {form.resultsVisibilityEnabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Results Available From</label>
                <input type="datetime-local" className="input-field" value={form.resultsVisibilityFrom} onChange={e => setForm({ ...form, resultsVisibilityFrom: e.target.value })} />
              </div>
              <div>
                <label className="label">Results Auto-Hide At</label>
                <input type="datetime-local" className="input-field" value={form.resultsVisibilityTo} onChange={e => setForm({ ...form, resultsVisibilityTo: e.target.value })} />
              </div>
            </div>
            <div>
              <p className="label">Quick set window (starts now):</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => quickSetWindow(1)} className="btn-outline text-xs">1 hour</button>
                <button type="button" onClick={() => quickSetWindow(24)} className="btn-outline text-xs">24 hours</button>
                <button type="button" onClick={() => quickSetWindow(24 * 7)} className="btn-outline text-xs">1 week</button>
                <button type="button" onClick={() => quickSetWindow(24 * 14)} className="btn-outline text-xs">2 weeks</button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Example: click "2 weeks" to publish results and have them disappear automatically after 14 days.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
