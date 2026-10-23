import { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldCheck, Eye, EyeOff, Search, Save, Settings, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinanceBlockPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [feesViewPercentage, setFeesViewPercentage] = useState(50);
  const [feesBlockingEnabled, setFeesBlockingEnabled] = useState(true);

  const fetchData = async () => {
    try {
      const [studentsRes, settingsRes] = await Promise.all([
        api.get(`/students?search=${search}`),
        api.get('/settings'),
      ]);
      setStudents(studentsRes.data.students);
      const s = settingsRes.data.settings;
      setSettings(s);
      setFeesViewPercentage(s?.feesViewPercentage || 50);
      setFeesBlockingEnabled(s?.feesBlockingEnabled !== false);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search]);

  const handleSaveSettings = async () => {
    try {
      await api.put('/settings', { feesViewPercentage, feesBlockingEnabled });
      toast.success('Settings saved');
    } catch (err: any) { toast.error('Failed to save'); }
  };

  const canViewResults = (s: any) => {
    const balance = Math.max(0, (s.feesRequired || 0) - (s.feesPaid || 0));
    return balance < 100 || (s.financeResultsAccessApproved === true && s.headmasterResultsAccessOverride === true);
  };

  const setFinanceApproval = async (student: any, approved: boolean) => {
    try {
      await api.patch(`/fees/${student._id}/results-access-approval`, { approved });
      toast.success(approved ? 'Special access approved for headmaster review' : 'Finance approval revoked');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update approval');
    }
  };

  const totalWithBalance = students.filter(s => (s.feesRequired || 0) - (s.feesPaid || 0) > 0);
  const blockedCount = totalWithBalance.filter(s => !canViewResults(s)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck size={24} /> Result Access Control
        </h1>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Settings size={18} /> Fees Threshold Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Minimum Payment Percentage to View Results</label>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={feesViewPercentage} onChange={e => setFeesViewPercentage(+e.target.value)} className="flex-1" />
              <span className="text-lg font-bold text-mlk-red w-16 text-right">{feesViewPercentage}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Students must pay at least {feesViewPercentage}% of their fees to view results</p>
          </div>
          <div>
            <label className="label">Fees Blocking</label>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => setFeesBlockingEnabled(!feesBlockingEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${feesBlockingEnabled ? 'bg-mlk-red' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${feesBlockingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm font-medium">{feesBlockingEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">When disabled, all students can view results regardless of fees</p>
          </div>
        </div>
        <button onClick={handleSaveSettings} className="btn-primary"><Save size={16} /> Save Settings</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Students with Balance</p>
          <p className="text-2xl font-bold text-amber-600">{totalWithBalance.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Results Blocked</p>
          <p className="text-2xl font-bold text-red-600">{blockedCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Results Allowed</p>
          <p className="text-2xl font-bold text-green-600">{totalWithBalance.length - blockedCount}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="input-field pl-10" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Adm No.</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3 text-right">Required</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Paid %</th>
                <th className="px-4 py-3">Results Access</th>\n                <th className="px-4 py-3">Finance Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(9)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>)}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">No students found</td></tr>
              ) : (
                students.map(s => {
                  const required = s.feesRequired || 0;
                  const paid = s.feesPaid || 0;
                  const balance = required - paid;
                  const paidPct = required > 0 ? Math.round((paid / required) * 100) : 100;
                  const allowed = canViewResults(s);
                  return (
                    <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm font-mono">{s.admissionNumber}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.firstName} {s.lastName}</td>
                      <td className="px-4 py-3 text-sm">{s.className?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right">${required.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">${paid.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-600">${balance > 0 ? balance.toLocaleString() : '0'}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div className={`h-2 rounded-full ${paidPct >= feesViewPercentage ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(paidPct, 100)}%` }}></div>
                          </div>
                          <span className={`text-xs font-medium ${paidPct >= feesViewPercentage ? 'text-green-600' : 'text-red-600'}`}>{paidPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {allowed ? (
                          <span className="badge badge-success flex items-center gap-1 w-fit"><Eye size={14} /> Allowed</span>
                        ) : (
                          <span className="badge badge-danger flex items-center gap-1 w-fit"><EyeOff size={14} /> Blocked</span>
                        )}
                        {balance >= 100 && s.financeResultsAccessApproved && !s.headmasterResultsAccessOverride && <p className="text-xs text-amber-600 mt-1">Awaiting headmaster</p>}
                      </td>
                      <td className="px-4 py-3">
                        {balance < 100 ? (
                          <span className="text-xs text-gray-500">Not required (&lt;$100)</span>
                        ) : (
                          <button onClick={() => setFinanceApproval(s, !s.financeResultsAccessApproved)}
                            className={`text-xs px-3 py-2 rounded-lg font-semibold inline-flex items-center gap-1 ${s.financeResultsAccessApproved ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}>
                            {s.financeResultsAccessApproved ? <><CheckCircle size={14} /> Revoke approval</> : <><CheckCircle size={14} /> Approve for headmaster</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
