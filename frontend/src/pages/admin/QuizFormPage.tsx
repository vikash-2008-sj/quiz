import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import type { QuizStatus } from '@/types';

function toLocalDatetimeInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function QuizFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<QuizStatus>('DRAFT');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    api
      .getQuiz(Number(id))
      .then((q) => {
        setTitle(q.title);
        setCourseCode(q.courseCode || '');
        setDepartment(q.department || '');
        setDescription(q.description || '');
        setStatus(q.status);
        setStartsAt(toLocalDatetimeInput(q.startsAt));
        setEndsAt(toLocalDatetimeInput(q.endsAt));
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Unable to load quiz details.');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      title: title.trim(),
      courseCode: courseCode.trim() || undefined,
      department: department.trim() || undefined,
      description: description.trim() || undefined,
      status,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
    };

    try {
      if (isEdit && id) {
        const updated = await api.updateQuiz(Number(id), payload);
        toast({ title: 'Quiz updated', description: `"${updated.title}" saved.`, variant: 'success' });
        navigate(`/admin/quizzes/${updated.id}/questions`);
      } else {
        const created = await api.createQuiz(payload);
        toast({
          title: 'Quiz created',
          description: 'Now add MCQ questions and publish your quiz.',
          variant: 'success',
        });
        navigate(`/admin/quizzes/${created.id}/questions`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save quiz.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={isEdit ? 'Edit Quiz' : 'Create New Quiz'}
      subtitle={isEdit ? 'Update quiz metadata, schedule, and publication status' : 'Set up a new classroom MCQ quiz and generate shareable QR codes'}
      actions={
        <Link to="/admin/quizzes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Quizzes
          </Button>
        </Link>
      }
    >
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{isEdit ? 'Quiz Configuration' : 'Quiz Details'}</CardTitle>
          <CardDescription>
            Every quiz automatically gets a unique public link and scannable QR code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="title" className="text-sm font-semibold text-slate-800">
                  Quiz Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="e.g., CS201: Binary Trees & Heaps Live Check"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="courseCode" className="text-sm font-semibold text-slate-800">
                    Course Code
                  </label>
                  <Input
                    id="courseCode"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    maxLength={60}
                    placeholder="e.g., CS201"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="department" className="text-sm font-semibold text-slate-800">
                    Department
                  </label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    maxLength={120}
                    placeholder="e.g., Computer Science & Engineering"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="description" className="text-sm font-semibold text-slate-800">
                  Description / Instructions
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Optional classroom instructions shown at the top of the student quiz page."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label htmlFor="status" className="text-sm font-semibold text-slate-800">
                    Status
                  </label>
                  <Select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as QuizStatus)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="CLOSED">Closed</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="startsAt" className="text-sm font-semibold text-slate-800">
                    Opens At (Optional)
                  </label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="endsAt" className="text-sm font-semibold text-slate-800">
                    Closes At (Optional)
                  </label>
                  <Input
                    id="endsAt"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Link to="/admin/quizzes">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isEdit ? 'Save & Manage Questions' : 'Create & Add Questions'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
