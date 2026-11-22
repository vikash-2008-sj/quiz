import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Users,
  CheckCircle2,
  XCircle,
  Percent,
  ShieldCheck,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { AdminQuizSummary, QuizAnalytics } from '@/types';

const PIE_COLORS = ['#10b981', '#ef4444'];

export function AnalyticsPage() {
  const { quizId: routeQuizId } = useParams();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<AdminQuizSummary[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(routeQuizId || '');
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    api.listQuizzes().then((list) => {
      setQuizzes(list);
      if (!routeQuizId && !selectedQuizId && list.length > 0) {
        setSelectedQuizId(String(list[0].id));
      } else if (routeQuizId) {
        setSelectedQuizId(routeQuizId);
      } else if (list.length === 0) {
        setLoading(false);
      }
    });
  }, [routeQuizId, selectedQuizId]);

  useEffect(() => {
    if (!selectedQuizId) return;
    setLoading(true);
    api
      .getQuizAnalytics(Number(selectedQuizId))
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, [selectedQuizId, refreshTick]);

  const handleSelectQuiz = (newId: string) => {
    setSelectedQuizId(newId);
    navigate(`/admin/analytics/${newId}`, { replace: true });
  };

  return (
    <AdminLayout
      title="Quiz Analytics"
      subtitle="Strictly aggregate option distributions, accuracy rates, and valid submission counts"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshTick((n) => n + 1)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {analytics && (
            <Link to={`/admin/qr-codes?quizId=${analytics.quizId}`}>
              <Button size="sm">
                <QrCode className="h-4 w-4" />
                Quiz QR
              </Button>
            </Link>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Privacy Notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs sm:text-sm text-emerald-950">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Anonymous Aggregate Data Only:</strong> All percentages use <em>total valid submissions</em> as the denominator. Individual student responses, names, emails, roll numbers, and identity records are never stored or exposed.
          </span>
        </div>

        {/* Quiz Selector */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Inspect Quiz Statistics
              </label>
              <Select
                value={selectedQuizId}
                onChange={(e) => handleSelectQuiz(e.target.value)}
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.courseCode ? `[${q.courseCode}] ` : ''}
                    {q.title} — {q.totalSubmissions} submissions
                  </option>
                ))}
              </Select>
            </div>
            {analytics && (
              <div className="flex flex-wrap items-center gap-2">
                {analytics.courseCode && <Badge variant="default">{analytics.courseCode}</Badge>}
                {analytics.department && <Badge variant="secondary">{analytics.department}</Badge>}
                <Badge
                  variant={
                    analytics.status === 'PUBLISHED'
                      ? 'success'
                      : analytics.status === 'CLOSED'
                      ? 'destructive'
                      : 'warning'
                  }
                >
                  {analytics.status}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        ) : !analytics ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500">
              No quizzes available to analyze.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Total Valid Submissions"
                value={String(analytics.totalSubmissions)}
                subtitle={`Across ${analytics.totalQuestions} question(s)`}
                icon={Users}
                color="text-blue-600 bg-blue-50"
              />
              <SummaryCard
                title="Correct Answers"
                value={String(analytics.correctCount)}
                subtitle="Verified server-side"
                icon={CheckCircle2}
                color="text-emerald-600 bg-emerald-50"
              />
              <SummaryCard
                title="Incorrect Answers"
                value={String(analytics.incorrectCount)}
                subtitle="Valid non-matching options"
                icon={XCircle}
                color="text-red-600 bg-red-50"
              />
              <SummaryCard
                title="Overall Accuracy"
                value={`${analytics.accuracyPercentage.toFixed(2)}%`}
                subtitle="(Correct ÷ Total Valid) × 100"
                icon={Percent}
                color="text-indigo-600 bg-indigo-50"
              />
            </div>

            {/* Overview Charts */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Correct vs. Incorrect</CardTitle>
                  <CardDescription>Overall accuracy breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.totalSubmissions > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Correct', value: analytics.correctCount },
                              { name: 'Incorrect', value: analytics.incorrectCount },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={88}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {PIE_COLORS.map((color, idx) => (
                              <Cell key={color} fill={PIE_COLORS[idx]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: number) => [
                              `${val} (${((val / analytics.totalSubmissions) * 100).toFixed(2)}%)`,
                              '',
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="py-16 text-center text-sm text-slate-500">
                      No submissions recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Per-Question Accuracy (%)</CardTitle>
                  <CardDescription>Compare comprehension across each question in this quiz</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.questionAnalytics.length > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.questionAnalytics.map((q, idx) => ({
                            label: `Q${idx + 1}`,
                            question: q.questionText,
                            accuracy: q.accuracyPercentage,
                            submissions: q.totalSubmissions,
                          }))}
                          margin={{ top: 8, right: 16, left: -10, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(v: number) => [`${v.toFixed(2)}%`, 'Accuracy']}
                            labelFormatter={(_, p) => p?.[0]?.payload?.question || ''}
                          />
                          <Bar dataKey="accuracy" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="py-16 text-center text-sm text-slate-500">No questions in this quiz.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Per-Question Option-Wise Distribution Breakdown */}
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">
                Option-Wise Response Distribution
              </h2>

              {analytics.questionAnalytics.map((q, idx) => (
                <Card key={q.questionId}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                          Question {idx + 1}
                        </span>
                        <Badge variant={q.status === 'ACTIVE' ? 'success' : 'destructive'}>
                          {q.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
                        <span>Total: <strong className="text-slate-900">{q.totalSubmissions}</strong></span>
                        <span>Correct: <strong className="text-emerald-700">{q.correctCount}</strong></span>
                        <span>Incorrect: <strong className="text-red-600">{q.incorrectCount}</strong></span>
                        <span>Accuracy: <strong className="text-blue-700">{q.accuracyPercentage.toFixed(2)}%</strong></span>
                      </div>
                    </div>
                    <CardTitle className="text-base sm:text-lg pt-1">{q.questionText}</CardTitle>
                  </CardHeader>

                  <CardContent className="grid gap-6 lg:grid-cols-2 items-center">
                    {/* Bar Chart */}
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={q.optionStats.map((o) => ({
                            label: `Option ${o.optionLabel}`,
                            text: o.optionText,
                            percentage: o.percentage,
                            count: o.responseCount,
                            correct: o.correct,
                          }))}
                          margin={{ top: 8, right: 16, left: -12, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(val: number, _name: string, item: { payload?: { count?: number } }) => [
                              `${val.toFixed(2)}% (${item?.payload?.count ?? 0} responses)`,
                              'Share',
                            ]}
                            labelFormatter={(_, p) => p?.[0]?.payload?.text || ''}
                          />
                          <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={44}>
                            {q.optionStats.map((o) => (
                              <Cell
                                key={o.optionId}
                                fill={o.correct ? '#10b981' : '#64748b'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Exact Counts & Percentages */}
                    <div className="space-y-3">
                      {q.optionStats.map((opt) => (
                        <div key={opt.optionId} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                                  opt.correct
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {opt.optionLabel}
                              </span>
                              <span className="truncate font-medium text-slate-800">
                                {opt.optionText}
                              </span>
                              {opt.correct && (
                                <Badge variant="success" className="shrink-0">
                                  Correct
                                </Badge>
                              )}
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-slate-700">
                              {opt.responseCount} ({opt.percentage.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                opt.correct ? 'bg-emerald-500' : 'bg-blue-500/80'
                              }`}
                              style={{ width: `${Math.min(100, opt.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
