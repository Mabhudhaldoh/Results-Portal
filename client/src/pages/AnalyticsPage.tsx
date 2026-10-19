import { useState, useEffect } from 'react';
import api from '../services/api';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { TrendingUp, Users, BookOpen, Award } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/analytics').then(res => { setAnalytics(res.data.analytics); setLoading(false); });
  }, []);

  if (loading) return <div className="card animate-pulse h-96"></div>;
  if (!analytics) return <p>Failed to load analytics</p>;

  const subjectData = {
    labels: analytics.subjectPerformance?.map((s: any) => s.subject?.name || 'Unknown') || [],
    datasets: [{
      label: 'Average Score',
      data: analytics.subjectPerformance?.map((s: any) => Math.round(s.avgMark * 100) / 100) || [],
      backgroundColor: 'rgba(185,28,28,0.8)',
      borderRadius: 8,
    }],
  };

  const gradeData = {
    labels: analytics.gradeDistribution?.map((g: any) => g._id || 'N/A') || [],
    datasets: [{
      data: analytics.gradeDistribution?.map((g: any) => g.count) || [],
      backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316', '#ef4444'],
    }],
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Results</p>
          <p className="text-2xl font-bold">{analytics.totalResults}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Average Mark</p>
          <p className="text-2xl font-bold text-mlk-red">{Math.round(analytics.summary?.avg || 0)}%</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Highest Mark</p>
          <p className="text-2xl font-bold text-emerald-500">{analytics.summary?.max || 0}%</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Lowest Mark</p>
          <p className="text-2xl font-bold text-amber-500">{analytics.summary?.min || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Subject Performance</h3>
          <Bar data={subjectData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Grade Distribution</h3>
          <Doughnut data={gradeData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }} />
        </div>
      </div>

      {analytics.classPerformance?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Class Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.classPerformance.map((c: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium">{c.className?.name}</p>
                <p className="text-2xl font-bold text-mlk-red">{Math.round(c.avgMark)}%</p>
                <p className="text-xs text-gray-500">{c.count} results</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
