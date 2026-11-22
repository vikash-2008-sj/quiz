import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Lock,
  Loader2,
} from 'lucide-react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api';
import type { AnswerResult, PublicQuestion } from '@/types';
import { cn } from '@/lib/utils';

const receiptKey = (code: string) => `cq_receipt_${code}`;

function loadCachedReceipt(code: string): AnswerResult | null {
  try {
    const raw = localStorage.getItem(receiptKey(code));
    return raw ? (JSON.parse(raw) as AnswerResult) : null;
  } catch {
    return null;
  }
}

function saveCachedReceipt(code: string, result: AnswerResult) {
  try {
    localStorage.setItem(receiptKey(code), JSON.stringify(result));
  } catch {
    // ignore
  }
}

export function QuestionTakePage() {
  const { publicCode = '' } = useParams();
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [submissionToken, setSubmissionToken] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSubmitError(null);
    setSelectedOptionId(null);

    const cached = loadCachedReceipt(publicCode);
    if (cached) {
      setResult(cached);
      setSelectedOptionId(cached.selectedOptionId);
      setAlreadySubmitted(true);
    } else {
      setResult(null);
      setAlreadySubmitted(false);
    }

    (async () => {
      try {
        const q = await api.getPublicQuestion(publicCode);
        if (!active) return;
        setQuestion(q);

        if (q.alreadySubmitted || cached) {
          setAlreadySubmitted(true);
        } else if (q.status === 'ACTIVE' && q.quizStatus === 'PUBLISHED') {
          const tok = await api.issueSubmissionToken(q.publicCode);
          if (!active) return;
          if (tok.alreadySubmitted) {
            setAlreadySubmitted(true);
          } else {
            setSubmissionToken(tok.submissionToken);
          }
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load this question.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [publicCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || selectedOptionId === null || !submissionToken || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const answerResult = await api.submitAnswer(question.publicCode, selectedOptionId, submissionToken);
      setResult(answerResult);
      setAlreadySubmitted(true);
      setSubmissionToken(null);
      saveCachedReceipt(question.publicCode, answerResult);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadySubmitted(true);
        setSubmitError(err.message);
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Could not submit your answer. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </StudentLayout>
    );
  }

  if (error || !question) {
    return (
      <StudentLayout>
        <Card className="mx-auto max-w-lg text-center">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Question Unavailable</h2>
            <p className="text-sm text-slate-600">{error || 'This link may be invalid or unpublished.'}</p>
            <div className="pt-2 flex justify-center gap-3">
              <Link to="/">
                <Button variant="outline">Back to Portal</Button>
              </Link>
              <Link to="/feedback">
                <Button>Submit Anonymous Feedback</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </StudentLayout>
    );
  }

  const isClosed = question.status !== 'ACTIVE' || question.quizStatus !== 'PUBLISHED';
  const locked = Boolean(result) || alreadySubmitted || isClosed;

  return (
    <StudentLayout>
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Quiz Context Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-blue-900 font-medium">
            <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
            <span>{question.quizTitle}</span>
            {question.courseCode && <Badge variant="default">{question.courseCode}</Badge>}
          </div>
          <Link
            to={`/quiz/${question.quizPublicCode}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
          >
            Full Quiz
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-md">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Question #{question.orderIndex}
              </span>
              {isClosed ? (
                <Badge variant="destructive">Closed</Badge>
              ) : alreadySubmitted ? (
                <Badge variant="success">Submitted</Badge>
              ) : (
                <Badge variant="default">Open for Response</Badge>
              )}
            </div>
            <CardTitle className="text-lg sm:text-xl leading-snug text-slate-900">
              {question.questionText}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 pt-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Anonymous response — no identity or login required. Correct answer unlocks after submission.</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-6">
            {isClosed && !result && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <Lock className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-semibold">Submissions are currently closed</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    This {question.quizStatus !== 'PUBLISHED' ? 'quiz' : 'question'} is no longer accepting new answers.
                  </p>
                </div>
              </div>
            )}

            {alreadySubmitted && !result && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-semibold">Response Already Recorded</p>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Duplicate submissions are prevented using a privacy-preserving one-time token.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {question.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                const isCorrectOption = result ? result.correctOptionId === opt.id : false;
                const isWrongSelected = result ? isSelected && !result.correct : false;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={locked}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={cn(
                      'w-full flex items-start gap-3.5 rounded-xl border-2 p-4 text-left transition-all',
                      !locked && 'hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer',
                      locked && 'cursor-default',
                      !result && isSelected && 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100',
                      !result && !isSelected && 'border-slate-200 bg-white',
                      result && isCorrectOption && 'border-emerald-500 bg-emerald-50/70',
                      result && isWrongSelected && 'border-red-400 bg-red-50/70',
                      result && !isCorrectOption && !isWrongSelected && 'border-slate-200 bg-slate-50/50 opacity-75'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold border',
                        !result && isSelected && 'border-blue-600 bg-blue-600 text-white',
                        !result && !isSelected && 'border-slate-300 bg-slate-50 text-slate-700',
                        result && isCorrectOption && 'border-emerald-600 bg-emerald-600 text-white',
                        result && isWrongSelected && 'border-red-500 bg-red-500 text-white',
                        result && !isCorrectOption && !isWrongSelected && 'border-slate-200 bg-white text-slate-500'
                      )}
                    >
                      {opt.optionLabel}
                    </span>
                    <span className="flex-1 pt-1 text-sm sm:text-base font-medium text-slate-900">
                      {opt.optionText}
                    </span>
                    {result && isCorrectOption && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-1" />
                    )}
                    {result && isWrongSelected && (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              {!locked && (
                <div className="pt-3">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={selectedOptionId === null || !submissionToken || submitting}
                    className="w-full h-12 text-base font-semibold"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting Answer...
                      </>
                    ) : (
                      'Submit Answer'
                    )}
                  </Button>
                </div>
              )}
            </form>

            {/* Post-Submission Result & Explanation */}
            {result && (
              <div
                className={cn(
                  'mt-6 rounded-xl border p-5 space-y-3',
                  result.correct
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-amber-200 bg-amber-50/70'
                )}
              >
                <div className="flex items-center gap-2.5">
                  {result.correct ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 shrink-0" />
                  )}
                  <div>
                    <h3
                      className={cn(
                        'text-base font-bold',
                        result.correct ? 'text-emerald-900' : 'text-slate-900'
                      )}
                    >
                      {result.correct ? 'Correct Answer!' : 'Incorrect Answer'}
                    </h3>
                    <p className="text-xs text-slate-600">
                      Correct option:{' '}
                      <span className="font-semibold text-slate-900">
                        {result.correctOptionLabel}. {result.correctOptionText}
                      </span>
                    </p>
                  </div>
                </div>

                {result.explanation && (
                  <div className="rounded-lg bg-white/90 border border-slate-200/80 p-3.5 text-sm text-slate-700 leading-relaxed">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">
                      Explanation
                    </span>
                    {result.explanation}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Link to={`/quiz/${question.quizPublicCode}`}>
                    <Button variant="outline" size="sm">
                      View All Questions in Quiz
                    </Button>
                  </Link>
                  <Link to="/feedback">
                    <Button variant="ghost" size="sm">
                      Share Anonymous Feedback
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
