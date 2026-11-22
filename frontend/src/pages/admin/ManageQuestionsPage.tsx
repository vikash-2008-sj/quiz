import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  QrCode,
  CheckCircle2,
  Play,
  Square,
  BarChart3,
  Loader2,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import type { AdminOption, AdminQuestion, AdminQuizDetail, QuestionStatus } from '@/types';

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function makeDefaultOptions(): AdminOption[] {
  return [
    { optionLabel: 'A', optionText: '', correct: true },
    { optionLabel: 'B', optionText: '', correct: false },
    { optionLabel: 'C', optionText: '', correct: false },
    { optionLabel: 'D', optionText: '', correct: false },
  ];
}

export function ManageQuestionsPage() {
  const { id } = useParams();
  const quizId = Number(id);
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<AdminQuizDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [qStatus, setQStatus] = useState<QuestionStatus>('ACTIVE');
  const [options, setOptions] = useState<AdminOption[]>(makeDefaultOptions());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await api.getQuiz(quizId);
      setQuiz(detail);
    } catch (err) {
      toast({
        title: 'Unable to load quiz',
        description: err instanceof ApiError ? err.message : 'Quiz not found.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [quizId, toast]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const openCreateModal = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setExplanation('');
    setQStatus('ACTIVE');
    setOptions(makeDefaultOptions());
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (q: AdminQuestion) => {
    setEditingQuestion(q);
    setQuestionText(q.questionText);
    setExplanation(q.explanation || '');
    setQStatus(q.status);
    setOptions(
      q.options.map((o) => ({
        id: o.id,
        optionLabel: o.optionLabel,
        optionText: o.optionText,
        correct: o.correct,
      }))
    );
    setFormError(null);
    setModalOpen(true);
  };

  const handleOptionTextChange = (idx: number, text: string) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, optionText: text } : o)));
  };

  const handleCorrectSelect = (idx: number) => {
    setOptions((prev) => prev.map((o, i) => ({ ...o, correct: i === idx })));
  };

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [
      ...prev,
      { optionLabel: LABELS[prev.length] || String(prev.length + 1), optionText: '', correct: false },
    ]);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== idx).map((o, i) => ({ ...o, optionLabel: LABELS[i] }));
      if (!next.some((o) => o.correct) && next.length > 0) {
        next[0].correct = true;
      }
      return next;
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!questionText.trim()) {
      setFormError('Question text is required.');
      return;
    }
    if (options.some((o) => !o.optionText.trim())) {
      setFormError('Please fill in text for every option.');
      return;
    }
    if (options.filter((o) => o.correct).length !== 1) {
      setFormError('Select exactly one correct option.');
      return;
    }

    setSaving(true);
    const payload = {
      questionText: questionText.trim(),
      explanation: explanation.trim() || undefined,
      status: qStatus,
      options: options.map((o, idx) => ({
        id: o.id,
        optionLabel: LABELS[idx] || o.optionLabel,
        optionText: o.optionText.trim(),
        correct: o.correct,
      })),
    };

    try {
      if (editingQuestion) {
        await api.updateQuestion(editingQuestion.id, payload);
        toast({ title: 'Question updated', variant: 'success' });
      } else {
        await api.addQuestion(quizId, payload);
        toast({ title: 'Question added', variant: 'success' });
      }
      setModalOpen(false);
      loadQuiz();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to save question.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleQuestionStatus = async (q: AdminQuestion) => {
    const nextStatus: QuestionStatus = q.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    try {
      await api.updateQuestionStatus(q.id, nextStatus);
      toast({
        title: `Question ${nextStatus === 'ACTIVE' ? 'activated' : 'closed'}`,
        variant: 'success',
      });
      loadQuiz();
    } catch (err) {
      toast({
        title: 'Status update failed',
        description: err instanceof ApiError ? err.message : 'Error updating status.',
        variant: 'error',
      });
    }
  };

  const handleToggleQuizPublish = async () => {
    if (!quiz) return;
    const nextStatus = quiz.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';
    try {
      await api.updateQuizStatus(quiz.id, nextStatus);
      toast({ title: `Quiz ${nextStatus.toLowerCase()}`, variant: 'success' });
      loadQuiz();
    } catch (err) {
      toast({
        title: 'Cannot update quiz status',
        description: err instanceof ApiError ? err.message : 'Check quiz questions first.',
        variant: 'error',
      });
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteQuestion(deleteTarget.id);
      toast({ title: 'Question deleted', variant: 'success' });
      setDeleteTarget(null);
      loadQuiz();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof ApiError ? err.message : 'Could not delete question.',
        variant: 'error',
      });
    }
  };

  return (
    <AdminLayout
      title={quiz ? quiz.title : 'Manage Questions'}
      subtitle={
        quiz
          ? `${quiz.courseCode || 'Quiz'} · ${quiz.questions.length} MCQ question(s) · Public Code: ${quiz.publicCode}`
          : 'Create and edit MCQ questions, correct answers, and explanations'
      }
      actions={
        <div className="flex items-center gap-2">
          <Link to="/admin/quizzes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Quizzes
            </Button>
          </Link>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      }
    >
      {loading || !quiz ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quiz Summary Strip */}
          <Card>
            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    quiz.status === 'PUBLISHED'
                      ? 'success'
                      : quiz.status === 'CLOSED'
                      ? 'destructive'
                      : 'warning'
                  }
                >
                  {quiz.status}
                </Badge>
                <span className="text-sm text-slate-600">
                  {quiz.totalSubmissions} total anonymous submissions
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={quiz.status === 'PUBLISHED' ? 'outline' : 'success'}
                  size="sm"
                  onClick={handleToggleQuizPublish}
                >
                  {quiz.status === 'PUBLISHED' ? (
                    <>
                      <Square className="h-3.5 w-3.5" />
                      Close Quiz
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Publish Quiz
                    </>
                  )}
                </Button>
                <Link to={`/admin/qr-codes?quizId=${quiz.id}`}>
                  <Button variant="outline" size="sm">
                    <QrCode className="h-3.5 w-3.5" />
                    Quiz QR
                  </Button>
                </Link>
                <Link to={`/admin/analytics/${quiz.id}`}>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Questions List */}
          {quiz.questions.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center space-y-3">
                <p className="text-base font-semibold text-slate-900">No questions in this quiz yet</p>
                <p className="text-sm text-slate-500">
                  Add multiple-choice questions with options, a correct answer, and an optional post-submission explanation.
                </p>
                <Button onClick={openCreateModal}>
                  <Plus className="h-4 w-4" />
                  Add First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {quiz.questions.map((q, idx) => (
                <Card key={q.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                            Question {idx + 1}
                          </span>
                          <Badge variant={q.status === 'ACTIVE' ? 'success' : 'destructive'}>
                            {q.status}
                          </Badge>
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                            {q.publicCode}
                          </code>
                          <span className="text-xs text-slate-500">
                            {q.submissionCount} submission(s)
                          </span>
                        </div>
                        <CardTitle className="text-base sm:text-lg leading-snug">
                          {q.questionText}
                        </CardTitle>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleQuestionStatus(q)}
                        >
                          {q.status === 'ACTIVE' ? 'Close' : 'Activate'}
                        </Button>
                        <Link to={`/admin/qr-codes?quizId=${quiz.id}&questionId=${q.id}`}>
                          <Button variant="outline" size="sm">
                            <QrCode className="h-3.5 w-3.5" />
                            QR
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(q)} title="Edit">
                          <Edit3 className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(q)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id || opt.optionLabel}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                            opt.correct
                              ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-medium'
                              : 'border-slate-200 bg-slate-50/40 text-slate-700'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                              opt.correct
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-600'
                            }`}
                          >
                            {opt.optionLabel}
                          </span>
                          <span className="flex-1">{opt.optionText}</span>
                          {opt.correct && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <CardDescription className="rounded-lg bg-blue-50/50 border border-blue-100 px-3.5 py-2.5 text-xs text-slate-700">
                        <strong className="text-blue-800">Post-Submission Explanation: </strong>
                        {q.explanation}
                      </CardDescription>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Question Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingQuestion ? 'Edit MCQ Question' : 'Add MCQ Question'}
        description="Correct answers and explanations are hidden from students until after submission."
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800">
              Question Text <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              placeholder="Enter your multiple-choice question..."
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">
                Options (Select the correct answer) <span className="text-red-500">*</span>
              </label>
              {options.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Option
                </Button>
              )}
            </div>

            <div className="space-y-2.5">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={opt.correct}
                    onChange={() => handleCorrectSelect(idx)}
                    className="h-4 w-4 accent-emerald-600 cursor-pointer"
                    aria-label={`Mark option ${LABELS[idx]} as correct`}
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                    {LABELS[idx]}
                  </span>
                  <Input
                    value={opt.optionText}
                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                    placeholder={`Option ${LABELS[idx]} text`}
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove option"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800">
              Explanation <span className="text-xs font-normal text-slate-400">(Optional — shown only after submission)</span>
            </label>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              placeholder="Explain why the correct answer is right..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800">Question Status</label>
            <Select
              value={qStatus}
              onChange={(e) => setQStatus(e.target.value as QuestionStatus)}
            >
              <option value="ACTIVE">Active (Accepting student answers)</option>
              <option value="CLOSED">Closed (Locked)</option>
            </Select>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingQuestion ? (
                'Update Question'
              ) : (
                'Create Question'
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Question Modal */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Question?"
        description="This permanently removes the question and its anonymous response totals."
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">{deleteTarget?.questionText}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuestion}>
              Delete Question
            </Button>
          </div>
        </div>
      </Dialog>
    </AdminLayout>
  );
}
