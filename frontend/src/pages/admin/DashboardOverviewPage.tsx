import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  CheckCircle2,
  Users,
  TrendingUp,
  MessageSquareLock,
  PlusCircle,
  QrCode,
  BarChart3,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { DashboardOverview } from '@/types';

export function DashboardOverviewPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDashboardOverview()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout
      title="Dashboard Overview"
      subtitle="Aggregate classroom engagement, quiz accuracy, and campus feedback metrics"
      actions={
        <Link to="/admin/quizzes/new">
          <Button size="sm">
            <PlusCircle className="h-4 w-4" />
            Create Quiz
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Privacy Guarantee Ribbon */}
        <div className="flex items-center gap-2.5 rounded-xl border border-blue-200/80 bg-blue-50/70 px-4 py-3 text-xs sm:text-sm text-blue-900">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            <strong>Privacy-First Architecture:</strong> All quiz analytics below are strictly aggregate totals. Individual student responses and identities are never stored or accessible.
          </span>
        </div>

        {/* Stat Cards */}
        {loading || !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
            <StatCard
              label="Total Quizzes"
              value={String(data.totalQuizzes)}
              sub={`${data.publishedQuizzes} published · ${data.totalQuestions} questions`}
              icon={ClipboardList}
              tone="blue"
            />
            <StatCard
              label="Valid Submissions"
              value={String(data.totalSubmissions)}
              sub="Anonymous one-time responses"
              icon={Users}
              tone="indigo"
            />
            <StatCard
              label="Correct Responses"
              value={String(data.totalCorrectSubmissions)}
              sub={`${data.totalIncorrectSubmissions} incorrect`}
              icon={CheckCircle2}
              tone="emerald"
            />
            <StatCard
              label="Overall Accuracy"
              value={`${data.overallAccuracyPercentage.toFixed(1)}%`}
              sub="Correct / total valid submissions"
              icon={TrendingUp}
              tone="sky"
            />
            {isAdmin && (
              <StatCard
                label="Pending Feedback"
                value={String(data.pendingFeedbackCount ?? 0)}
                sub={`${data.totalFeedbackCount ?? 0} total anonymous records`}
                icon={MessageSquareLock}
                tone="amber"
              />
            )}
          </div>
        )}

        {/* Charts Row */}
        <div className={`grid gap-6 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          <Card className={isAdmin ? 'lg:col-span-2' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Quiz Accuracy Comparison (%)</CardTitle>
                <CardDescription>Aggregate accuracy percentage across recent quizzes</CardDescription>
              </div>
              <Link to="/admin/analytics">
                <Button variant="ghost" size="sm">
                  Full Analytics
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : data && data.quizComparisons.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.quizComparisons.map((q) => ({
                        name: q.courseCode || q.title.slice(0, 14),
                        fullTitle: q.title,
                        accuracy: q.accuracyPercentage,
                        submissions: q.totalSubmissions,
                      }))}
                      margin={{ top: 10, right: 16, left: -12, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: '#475569' }} />
                      <Tooltip
                        formatter={(value, name) =>
                          name === 'accuracy'
                            ? [`${Number(value).toFixed(1)}%`, 'Accuracy' as string]
                            : [Number(value), 'Submissions' as string]
                        }
                        labelFormatter={(_label, payload) =>
                          (payload?.[0]?.payload as { fullTitle?: string } | undefined)?.fullTitle || ''
                        }
                      />
                      <Bar dataKey="accuracy" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-slate-500">
                  No quiz data yet. Create and publish your first quiz to see live analytics.
                </p>
              )}
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Feedback by Category</CardTitle>
                  <CardDescription>Anonymous campus topics</CardDescription>
                </div>
                <Link to="/admin/feedback">
                  <Button variant="ghost" size="sm">
                    Review
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : data && data.feedbackByCategory.length > 0 ? (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.feedbackByCategory}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <YAxis
                          type="category"
                          dataKey="category"
                          width={110}
                          tick={{ fontSize: 11, fill: '#334155' }}
                        />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0ea5e9" radius={[0, 6, 6, 0]} maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">
                    No anonymous feedback submitted yet.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Quizzes Table + Quick Actions */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent Quizzes</CardTitle>
              <CardDescription>Quick access to QR codes, questions, and aggregate statistics</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/qr-codes">
                <Button variant="outline" size="sm">
                  <QrCode className="h-4 w-4" />
                  QR Generator
                </Button>
              </Link>
              <Link to="/admin/quizzes">
                <Button variant="outline" size="sm">
                  View All Quizzes
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Quiz</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Submissions</th>
                    <th className="px-4 py-3 font-semibold text-right">Accuracy</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.quizComparisons.map((q) => (
                    <tr key={q.quizId} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900">{q.title}</div>
                        {q.courseCode && (
                          <span className="text-xs text-slate-500">{q.courseCode}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            q.status === 'PUBLISHED'
                              ? 'success'
                              : q.status === 'CLOSED'
                              ? 'destructive'
                              : 'warning'
                          }
                        >
                          {q.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                        {q.totalSubmissions}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-blue-700">
                        {q.accuracyPercentage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link to={`/admin/quizzes/${q.quizId}/questions`}>
                            <Button variant="ghost" size="sm">
                              Questions
                            </Button>
                          </Link>
                          <Link to={`/admin/analytics/${q.quizId}`}>
                            <Button variant="outline" size="sm">
                              <BarChart3 className="h-3.5 w-3.5" />
                              Stats
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && (!data || data.quizComparisons.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                        No quizzes created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'blue' | 'indigo' | 'emerald' | 'sky' | 'amber';
}) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{sub}</p>
      </CardContent>
    </Card>
  );
}
