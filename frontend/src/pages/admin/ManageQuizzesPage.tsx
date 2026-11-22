import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Search,
  Edit3,
  Trash2,
  QrCode,
  BarChart3,
  ListChecks,
  Play,
  Square,
  ExternalLink,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { formatDateOnly } from '@/lib/utils';
import type { AdminQuizSummary, QuizStatus } from '@/types';

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Closed', value: 'CLOSED' },
];

export function ManageQuizzesPage() {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<AdminQuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminQuizSummary | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listQuizzes({ status: statusFilter, search });
      setQuizzes(list);
    } catch (err) {
      toast({
        title: 'Failed to load quizzes',
        description: err instanceof ApiError ? err.message : 'Please refresh the page.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, toast]);

  useEffect(() => {
    const timer = window.setTimeout(loadQuizzes, 180);
    return () => window.clearTimeout(timer);
  }, [loadQuizzes]);

  const handleStatusChange = async (quiz: AdminQuizSummary, newStatus: QuizStatus) => {
    setBusyId(quiz.id);
    try {
      await api.updateQuizStatus(quiz.id, newStatus);
      toast({
        title: `Quiz ${newStatus.toLowerCase()}`,
        description: `"${quiz.title}" is now ${newStatus}.`,
        variant: 'success',
      });
      loadQuizzes();
    } catch (err) {
      toast({
        title: 'Status update failed',
        description: err instanceof ApiError ? err.message : 'Could not update quiz status.',
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await api.deleteQuiz(deleteTarget.id);
      toast({
        title: 'Quiz deleted',
        description: `"${deleteTarget.title}" and its questions were removed.`,
        variant: 'success',
      });
      setDeleteTarget(null);
      loadQuizzes();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof ApiError ? err.message : 'Unable to delete quiz.',
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout
      title="Manage Quizzes"
      subtitle="Create, publish, close, and organize classroom MCQ assessments"
      actions={
        <Link to="/admin/quizzes/new">
          <Button size="sm">
            <PlusCircle className="h-4 w-4" />
            New Quiz
          </Button>
        </Link>
      }
    >
      <div className="space-y-5">
        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, course, department..."
                className="pl-9 h-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : quizzes.length === 0 ? (
              <div className="py-14 text-center space-y-3">
                <p className="text-sm font-medium text-slate-700">No matching quizzes found.</p>
                <Link to="/admin/quizzes/new">
                  <Button size="sm">
                    <PlusCircle className="h-4 w-4" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Quiz &amp; Course</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-center">Questions</th>
                      <th className="px-4 py-3 font-semibold text-center">Submissions</th>
                      <th className="px-4 py-3 font-semibold text-center">Accuracy</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quizzes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4 max-w-xs">
                          <p className="font-semibold text-slate-900 truncate">{q.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            {q.courseCode && <Badge variant="secondary">{q.courseCode}</Badge>}
                            {q.department && <span>{q.department}</span>}
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                              {q.publicCode}
                            </code>
                          </div>
                        </td>
                        <td className="px-4 py-4">
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
                        <td className="px-4 py-4 text-center font-medium text-slate-700">
                          {q.questionCount}
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-slate-700">
                          {q.totalSubmissions}
                        </td>
                        <td className="px-4 py-4 text-center font-semibold text-blue-700">
                          {q.accuracyPercentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatDateOnly(q.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {q.status !== 'PUBLISHED' ? (
                              <Button
                                variant="success"
                                size="sm"
                                disabled={busyId === q.id}
                                onClick={() => handleStatusChange(q, 'PUBLISHED')}
                                title="Publish quiz"
                              >
                                <Play className="h-3.5 w-3.5" />
                                Publish
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busyId === q.id}
                                onClick={() => handleStatusChange(q, 'CLOSED')}
                                title="Close quiz"
                              >
                                <Square className="h-3.5 w-3.5" />
                                Close
                              </Button>
                            )}

                            <Link to={`/admin/quizzes/${q.id}/questions`}>
                              <Button variant="outline" size="sm" title="Manage questions">
                                <ListChecks className="h-3.5 w-3.5" />
                                Questions
                              </Button>
                            </Link>

                            <Link to={`/admin/qr-codes?quizId=${q.id}`}>
                              <Button variant="ghost" size="icon" title="Generate QR Code">
                                <QrCode className="h-4 w-4 text-blue-600" />
                              </Button>
                            </Link>

                            <Link to={`/admin/analytics/${q.id}`}>
                              <Button variant="ghost" size="icon" title="View Analytics">
                                <BarChart3 className="h-4 w-4 text-indigo-600" />
                              </Button>
                            </Link>

                            <Link to={`/quiz/${q.publicCode}`} target="_blank">
                              <Button variant="ghost" size="icon" title="Open student link">
                                <ExternalLink className="h-4 w-4 text-slate-500" />
                              </Button>
                            </Link>

                            <Link to={`/admin/quizzes/${q.id}/edit`}>
                              <Button variant="ghost" size="icon" title="Edit quiz">
                                <Edit3 className="h-4 w-4 text-slate-600" />
                              </Button>
                            </Link>

                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete quiz"
                              onClick={() => setDeleteTarget(q)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Quiz?"
        description="This permanently removes the quiz, all its MCQ questions, options, and anonymous aggregate counts."
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Are you sure you want to delete{' '}
            <strong className="text-slate-900">{deleteTarget?.title}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busyId === deleteTarget?.id}
              onClick={handleConfirmDelete}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Dialog>
    </AdminLayout>
  );
}
