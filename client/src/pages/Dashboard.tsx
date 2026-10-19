import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Users, FileText, Clock, School, BookOpen,
  TrendingUp, TrendingDown, Award, Activity, KeyRound, Lock,
  DollarSign, Megaphone, CalendarDays, ClipboardList, AlertTriangle
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface StatItem {
  label: string; value: any; icon: any; color: string; change?: string;
}

interface DashboardData {
  totalStudents: number;
  totalTeachers: number;
  publishedResults: number;
  pendingResults: number;
  pendingApprovals?: number;
  totalClasses: number;
  totalSubjects: number;
  currentTerm: string;
  currentAcademicYear: string;
  averageMark: number;
  passRate: number;
  recentResults: any[];
  studentResults: any[];
  teacherResults: any[];
  feesStatus?: { feesRequired: number; feesPaid: number; feesBalance: number; paidPercentage: number; canViewResults: boolean };
  latestNotices?: any[];
  upcomingEvents?: any[];
  recentAssignments?: any[];
  resultsHiddenMessage?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) return toast.error('Fill in all fields');
    if (pwForm.newPw !== pwForm.confirm) return toast.error('New passwords do not match');
    if (pwForm.newPw.length < 6) return toast.error('Password must be at least 6 characters');
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast.success('Password changed successfully');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
    setPwLoading(false);
  };

  useEffect(() => {
    api.get('/dashboard').then(res => { setData(res.data.dashboard); setLoading(false); }).catch(() => setLoading(false));
    api.get('/reports/analytics').then(res => setAnalytics(res.data.analytics)).catch(() => {});
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="stat-card animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  );

  if (!data) return <p className="text-center py-8">Failed to load dashboard</p>;

  const stats: StatItem[] = user?.role === 'student' ? [
    { label: 'My Average', value: `${data.averageMark}%`, icon: TrendingUp, color: 'bg-cyan-500' },
    { label: 'My Pass Rate', value: `${data.passRate}%`, icon: Award, color: 'bg-mlk-red' },
    { label: 'My Results', value: data.publishedResults, icon: FileText, color: 'bg-purple-500' },
    { label: 'Outstanding Fees', value: `$${data.feesStatus?.feesBalance ?? 0}`, icon: DollarSign, color: 'bg-pink-500' },
  ] : user?.role === 'finance' ? [
    { label: 'Total Students', value: data.totalStudents, icon: GraduationCap, color: 'bg-blue-500' },
    { label: 'Published Results', value: data.publishedResults, icon: FileText, color: 'bg-purple-500' },
    { label: 'Average Mark', value: `${data.averageMark}%`, icon: TrendingUp, color: 'bg-cyan-500' },
    { label: 'Pass Rate', value: `${data.passRate}%`, icon: Award, color: 'bg-mlk-red' },
  ] : [
    { label: 'Total Students', value: data.totalStudents, icon: GraduationCap, color: 'bg-blue-500' },
    { label: 'Total Staff', value: data.totalTeachers, icon: Users, color: 'bg-emerald-500' },
    { label: 'Published Results', value: data.publishedResults, icon: FileText, color: 'bg-purple-500' },
    ...(user?.role === 'headmaster' && data.pendingApprovals ? [{ label: 'Pending Approvals', value: data.pendingApprovals, icon: Clock, color: 'bg-red-500' }] : []),
    { label: 'Pending Results', value: data.pendingResults, icon: Clock, color: 'bg-amber-500' },
    { label: 'Classes', value: data.totalClasses, icon: School, color: 'bg-pink-500' },
    { label: 'Subjects', value: data.totalSubjects, icon: BookOpen, color: 'bg-indigo-500' },
    { label: 'Average Mark', value: `${data.averageMark}%`, icon: TrendingUp, color: 'bg-cyan-500' },
    { label: 'Pass Rate', value: `${data.passRate}%`, icon: Award, color: 'bg-mlk-red' },
  ];

  const classPerf = analytics?.classPerformance || [];
  const gradeDist = analytics?.gradeDistribution || [];

  const barData = {
    labels: classPerf.length > 0 ? classPerf.map((c: any) => c.className?.name || 'Unknown') : ['No Data'],
    datasets: [{
      label: 'Average Score',
      data: classPerf.length > 0 ? classPerf.map((c: any) => Math.round(c.avgMark * 100) / 100) : [0],
      backgroundColor: classPerf.map((_: any, i: number) => i % 2 === 0 ? 'rgba(185,28,28,0.8)' : 'rgba(30,64,175,0.8)'),
      borderRadius: 8,
    }],
  };

  const gradeColors: Record<string, string> = { A: '#10b981', B: '#3b82f6', C: '#8b5cf6', D: '#f59e0b', E: '#f97316', U: '#ef4444' };
  const doughnutData = {
    labels: gradeDist.length > 0 ? gradeDist.map((g: any) => g._id + ' Grade') : ['No Data'],
    datasets: [{
      data: gradeDist.length > 0 ? gradeDist.map((g: any) => g.count) : [1],
      backgroundColor: gradeDist.length > 0 ? gradeDist.map((g: any) => gradeColors[g._id] || '#6b7280') : ['#e5e7eb'],
      borderWidth: 0,
    }],
  };

  const subjectPerf = analytics?.subjectPerformance || [];
  const lineData = {
    labels: subjectPerf.length > 0 ? subjectPerf.slice(0, 8).map((s: any) => s.subject?.name?.substring(0, 8) || 'Unknown') : ['No Data'],
    datasets: [{
      label: 'Average Performance',
      data: subjectPerf.length > 0 ? subjectPerf.slice(0, 8).map((s: any) => Math.round(s.avgMark * 100) / 100) : [0],
      borderColor: '#B91C1C',
      backgroundColor: 'rgba(185,28,28,0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.firstName}</h1>
          <p className="text-gray-500 dark:text-gray-400">{data.currentAcademicYear} - {data.currentTerm}</p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-success">System Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                {stat.change && (
                  <p className={`text-xs mt-1 ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                    {stat.change} from last term
                  </p>
                )}
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon size={22} className="text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {user?.role === 'student' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-lg bg-pink-100 text-pink-600"><DollarSign size={18} /></span>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Outstanding Fees</h3>
            </div>
            {(() => {
              const f = data.feesStatus;
              const balance = f?.feesBalance ?? 0;
              const outstanding = balance > 0;
              return (
                <>
                  <p className={`text-3xl font-bold ${outstanding ? 'text-red-600' : 'text-emerald-600'}`}>${balance.toLocaleString()}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Paid {f?.paidPercentage ?? 0}%</span>
                      <span>Required ${f?.feesRequired ?? 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${outstanding ? 'bg-pink-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(f?.paidPercentage ?? 0, 100)}%` }}></div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">{outstanding ? 'Please settle your fees balance with the finance office.' : 'Your fees are fully paid. Thank you!'}</p>
                </>
              );
            })()}
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-lg bg-blue-100 text-mlk-blue"><Megaphone size={18} /></span>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Latest Announcements</h3>
            </div>
            {data.latestNotices && data.latestNotices.length > 0 ? (
              <div className="space-y-3 max-h-44 overflow-y-auto">
                {data.latestNotices.map((n: any) => (
                  <div key={n._id} className={`p-3 rounded-lg ${n.category === 'emergency' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                    <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.content}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No announcements yet.</p>}
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-lg bg-purple-100 text-purple-600"><CalendarDays size={18} /></span>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Events</h3>
            </div>
            {data.upcomingEvents && data.upcomingEvents.length > 0 ? (
              <div className="space-y-3 max-h-44 overflow-y-auto">
                {data.upcomingEvents.map((ev: any) => (
                  <div key={ev._id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-center bg-mlk-red text-white rounded-lg px-2 py-1 min-w-[46px]">
                      <p className="text-xs font-bold leading-tight">{new Date(ev.date).getDate()}</p>
                      <p className="text-[10px] uppercase leading-tight">{new Date(ev.date).toLocaleString('en', { month: 'short' })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{ev.title}</p>
                      {ev.time && <p className="text-xs text-gray-500">{ev.time}{ev.location ? ` · ${ev.location}` : ''}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No upcoming events.</p>}
          </div>
        </div>
      )}

      {user?.role === 'student' && data.resultsHiddenMessage && (
        <div className="card border-amber-400 dark:border-amber-600">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={22} />
            <div>
              <p className="font-semibold">Results are currently unavailable</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{data.resultsHiddenMessage}</p>
            </div>
          </div>
        </div>
      )}

      {user?.role === 'student' && data.recentAssignments && data.recentAssignments.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Homework & Assignments</h3>
          <div className="space-y-3">
            {data.recentAssignments.map((a: any) => {
              const due = new Date(a.dueDate);
              const overdue = due < new Date();
              return (
                <div key={a._id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <ClipboardList size={18} className="text-mlk-blue" />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.title}</p>
                      <p className="text-xs text-gray-500">{a.subject?.name || ''} · Due {due.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.mySubmission ? (
                      a.mySubmission.isLate
                        ? <span className="badge badge-danger"><AlertTriangle size={12} /> Submitted Late</span>
                        : <span className="badge badge-success">Submitted</span>
                    ) : overdue
                      ? <span className="badge badge-danger">Overdue</span>
                      : <span className="badge badge-warning">Pending</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Class Performance</h3>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Grade Distribution</h3>
          <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }} />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Performance Trend</h3>
          <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />
        </div>
      </div>

      {user?.role === 'student' ? (
        data.studentResults && data.studentResults.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">My Recent Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Term</th>
                    <th className="px-4 py-3">Final Mark</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.studentResults.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm font-medium">{r.subject?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">{r.term}</td>
                      <td className="px-4 py-3 text-sm font-bold">{r.finalMark}</td>
                      <td className="px-4 py-3"><span className="badge badge-info">{r.grade || '-'}</span></td>
                      <td className="px-4 py-3">
                        <span className={`badge ${r.status === 'published' ? 'badge-success' : r.status === 'draft' ? 'badge-warning' : 'badge-gray'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        data.recentResults && data.recentResults.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recent Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Final Mark</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.recentResults.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm">{r.student?.firstName} {r.student?.lastName}</td>
                      <td className="px-4 py-3 text-sm">{r.subject?.name}</td>
                      <td className="px-4 py-3 text-sm font-medium">{r.finalMark}</td>
                      <td className="px-4 py-3"><span className="badge badge-info">{r.grade || '-'}</span></td>
                      <td className="px-4 py-3">
                        <span className={`badge ${r.status === 'published' ? 'badge-success' : r.status === 'draft' ? 'badge-warning' : 'badge-gray'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      <div className="card max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={20} className="text-mlk-blue" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Account Settings - Change Password</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="label">Current Password</label><input type="password" className="input-field" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} placeholder="Current password" /></div>
          <div><label className="label">New Password</label><input type="password" className="input-field" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} placeholder="New password" /></div>
          <div><label className="label">Confirm New Password</label><input type="password" className="input-field" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Confirm new password" /></div>
        </div>
        <button onClick={handleChangePassword} disabled={pwLoading} className="btn-primary mt-4 text-sm"><Lock size={16} /> {pwLoading ? 'Changing...' : 'Change Password'}</button>
      </div>
    </div>
  );
}
