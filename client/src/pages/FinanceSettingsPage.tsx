import { useEffect, useState } from 'react';
import api from '../services/api';
import { DollarSign, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinanceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ defaultFeesRequired: 500, feesViewPercentage: 50, feesBlockingEnabled: true });

  useEffect(() => {
    api.get('/settings').then(res => {
      const s = res.data.settings || {};
      setForm({
        defaultFeesRequired: Number(s.defaultFeesRequired ?? 500),
        feesViewPercentage: Number(s.feesViewPercentage ?? 50),
        feesBlockingEnabled: s.feesBlockingEnabled !== false,
      });
    }).catch((err: any) => toast.error(err.response?.data?.message || 'Unable to load finance settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (form.defaultFeesRequired < 0 || form.feesViewPercentage < 0 || form.feesViewPercentage > 100) {
      toast.error('Check the fee amount and payment percentage');
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
        <button onClick={save} disabled={saving} className="btn-primary"><Save size={18} /> {saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
      <div className="card space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2"><DollarSign size={20} /> Fees Configuration</h2>
        <div>
          <label className="label">Default Fees Required Per Student ($)</label>
          <input type="number" min="0" step="0.01" className="input-field" value={form.defaultFeesRequired} onChange={e => setForm({ ...form, defaultFeesRequired: Number(e.target.value) })} />
          <p className="text-sm text-gray-500 mt-1">Used as the default fee amount for newly added students. Existing students' balances are not changed by this setting.</p>
        </div>
        <div>
          <label className="label">Minimum Payment Percentage to View Results: {form.feesViewPercentage}%</label>
          <input type="range" min="0" max="100" value={form.feesViewPercentage} onChange={e => setForm({ ...form, feesViewPercentage: Number(e.target.value) })} className="w-full" />
          <p className="text-sm text-gray-500 mt-1">Students must meet this payment percentage to view results when fee blocking is enabled.</p>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="font-semibold flex items-center gap-2"><ShieldCheck size={18} /> Fees Blocking</h3>
          <div className="flex items-center gap-3 mt-3">
            <button type="button" role="switch" aria-checked={form.feesBlockingEnabled} onClick={() => setForm({ ...form, feesBlockingEnabled: !form.feesBlockingEnabled })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.feesBlockingEnabled ? 'bg-mlk-red' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.feesBlockingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm">{form.feesBlockingEnabled ? 'Enabled — minimum fee payment applies to results access' : 'Disabled — results access is not blocked by fees'}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500">School identity, grading, academic-year and results-publishing settings remain under administrator control.</p>
    </div>
  );
}
