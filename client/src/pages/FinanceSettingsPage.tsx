import { useEffect, useState } from 'react';
import api from '../services/api';
import { DollarSign, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

function BouncingDots() {
  return <span className="inline-flex items-center gap-1" role="status" aria-label="Saving in progress"><span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" /><span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" /><span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" /></span>;
}

export default function FinanceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ defaultFeesRequired: 500 });

  useEffect(() => {
    api.get('/settings').then(res => {
      const s = res.data.settings || {};
      setForm({
        defaultFeesRequired: Number(s.defaultFeesRequired ?? 500),
      });
    }).catch((err: any) => toast.error(err.response?.data?.message || 'Unable to load finance settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (form.defaultFeesRequired < 0) {
      toast.error('Fee amount cannot be negative');
      return;
    }
    setSaving(true);
    try {
      await api.put('/settings', form);
      toast.success('Finance settings saved successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unable to save finance settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card animate-pulse h-48" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fee defaults and fee-related student result access.</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">{saving ? <><BouncingDots /> Saving settings…</> : <><Save size={18} /> Save Changes</>}</button>
      </div>
      <div className="card space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2"><DollarSign size={20} /> Fees Configuration</h2>
        <div>
          <label className="label">Default Fees Required Per Student ($)</label>
          <input type="number" min="0" step="0.01" className="input-field" value={form.defaultFeesRequired} onChange={e => setForm({ ...form, defaultFeesRequired: Number(e.target.value) })} />
          <p className="text-sm text-gray-500 mt-1">Used as the default fee amount for newly added students. Existing students' balances are not changed by this setting.</p>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="font-semibold flex items-center gap-2"><ShieldCheck size={18} /> Student Results Access Policy</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Balances below $100 qualify automatically. For balances of $100 or more, the Finance department must approve the individual student and the Headmaster must then grant access. Both approvals are required.</p>
        </div>
      </div>
      <p className="text-xs text-gray-500">School identity, grading, academic-year and results-publishing settings remain under administrator control.</p>
    </div>
  );
}
