import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Award,
  MessageSquareHeart,
  Lock,
} from 'lucide-react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api';
import type { AnswerResult, PublicQuestion, PublicQuiz } from '@/types';
import { cn } from '@/lib/utils';

const receiptKey = (code: string) => `cq_receipt_${code}`;

function loadReceipt(code: string): AnswerResult | null {
  try {
    const raw = localStorage.getItem(receiptKey(code));
    return raw ? (JSON.parse(raw) as AnswerResult) : null;
  } catch {
    return null;
  }
}

function saveReceipt(code: string, res: AnswerResult) {
  try {
    localStorage.setItem(receiptKey(code), JSON.stringify(res));
  } catch {
    // ignore
  }
}

export function QuizTakePage() {
  const { publicCode = '' } = useParams();
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [selectedByQ, setSelectedByQ] = useState<Record<string, number>>({});
  const [resultsByQ, setResultsByQ] = useState<Record<string, AnswerResult>>({});
  const [alreadySubmittedByQ, setAlreadySubmittedByQ] = useState<Record<string, boolean>>({});
  const [submittingCode, setSubmittingCode] = useState<string | null>(null);
  const [errorByQ, setErrorByQ] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await api.getPublicQuiz(publicCode);
        if (!active) return;
        setQuiz(data);

        const initResults: Record<string, AnswerResult> = {};
        const initSelected: Record<string, number> = {};
        const initSubmitted: Record<string, boolean> = {};
        const initTokens: Record<string, string> = {};

        for (const q of data.questions) {
          const cached = loadReceipt(q.publicCode);
          if (cached) {
            initResults[q.publicCode] = cached;
            initSelected[q.publicCode] = cached.selectedOptionId;
            initSubmitted[q.publicCode] = true;
          } else if (q.alreadySubmitted) {
            initSubmitted[q.publicCode] = true;
          } else if (data.status === 'PUBLISHED' && q.status === 'ACTIVE') {
            try {
              const tok = await api.issueSubmissionToken(q.publicCode);
              if (tok.alreadySubmitted) {
                initSubmitted[q.publicCode] = true;
              } else if (tok.submissionToken) {
                initTokens[q.publicCode] = tok.submissionToken;
              }
            } catch {
              // ignore individual closed question token errors
            }
          }
        }

        if (!active) return;
        setResultsByQ(initResults);
        setSelectedByQ(initSelected);
        setAlreadySubmittedByQ(initSubmitted);
        setTokens(initTokens);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : 'Unable to load this quiz.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [publicCode]);

  const handleSubmitQuestion = async (q: PublicQuestion) => {
    const selectedOptionId = selectedByQ[q.publicCode];
    const token = tokens[q.publicCode];
    if (!selectedOptionId || !token || submittingCode) return;

    setSubmittingCode(q.publicCode);
    setErrorByQ((prev) => ({ ...prev, [q.publicCode]: '' }));
    try {
      const res = await api.submitAnswer(q.publicCode, selectedOptionId, token);
      saveReceipt(q.publicCode, res);
      setResultsByQ((prev) => ({ ...prev, [q.publicCode]: res }));
      setAlreadySubmittedByQ((prev) => ({ ...prev, [q.publicCode]: true }));
      setTokens((prev) => {
        const next = { ...prev };
        delete next[q.publicCode];
        return next;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadySubmittedByQ((prev) => ({ ...prev, [q.publicCode]: true }));
      }
      setErrorByQ((prev) => ({
        ...prev,
        [q.publicCode]: err instanceof ApiError ? err.message : 'Submission failed.',
      }));
    } finally {
      setSubmittingCode(null);
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="space-y-4 max-w-3xl mx-auto">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </StudentLayout>
    );
  }

  if (error || !quiz) {
    return (
      <StudentLayout>
        <Card className="mx-auto max-w-lg text-center">
          <CardContent className="py-12 space-y-4">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900">Quiz Not Available</h2>
            <p className="text-sm text-slate-600">{error || 'Please check the QR code or URL.'}</p>
            <Link to="/">
              <Button variant="outline">Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </StudentLayout>
    );
  }

  const totalQuestions = quiz.questions.length;
  const answeredCount = quiz.questions.filter((q) => alreadySubmittedByQ[q.publicCode]).length;
  const knownResults = Object.values(resultsByQ);
  const correctLocalCount = knownResults.filter((r) => r.correct).length;
  const progressPct = totalQuestions === 0 ? 0 : Math.round((answeredCount / totalQuestions) * 100);

  return (
    <StudentLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Quiz Header Card */}
        <Card className="border-blue-100 bg-white shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {quiz.courseCode && <Badge variant="default">{quiz.courseCode}</Badge>}
                {quiz.department && <Badge variant="secondary">{quiz.department}</Badge>}
              </div>
              <Badge variant={quiz.status === 'PUBLISHED' ? 'success' : 'destructive'}>
                {quiz.status}
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl mt-2">{quiz.title}</CardTitle>
            {quiz.description && <CardDescription className="text-sm">{quiz.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>
                Progress: {answeredCount} of {totalQuestions} answered
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                All responses are anonymous and protected against duplicates via one-time tokens. Answers unlock immediately after each submission.
              </span>
            </p>
          </CardContent>
        </Card>

        {quiz.status === 'CLOSED' && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <span>This quiz has been closed by the instructor and no longer accepts new answers.</span>
          </div>
        )}

        {/* Question Cards */}
        <div className="space-y-5">
          {quiz.questions.map((q, idx) => {
            const res = resultsByQ[q.publicCode];
            const isAlready = Boolean(alreadySubmittedByQ[q.publicCode]);
            const isClosed = quiz.status !== 'PUBLISHED' || q.status !== 'ACTIVE';
            const locked = Boolean(res) || isAlready || isClosed;
            const selectedId = selectedByQ[q.publicCode];

            return (
              <Card key={q.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Question {idx + 1} of {totalQuestions}
                    </span>
                    {res ? (
                      <Badge variant={res.correct ? 'success' : 'destructive'}>
                        {res.correct ? 'Correct' : 'Incorrect'}
                      </Badge>
                    ) : isAlready ? (
                      <Badge variant="success">Submitted</Badge>
                    ) : isClosed ? (
                      <Badge variant="destructive">Closed</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </div>
                  <CardTitle className="text-base sm:text-lg leading-snug pt-1">
                    {q.questionText}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-5 space-y-3">
                  {q.options.map((opt) => {
                    const isSelected = selectedId === opt.id;
                    const isCorrectOpt = res ? res.correctOptionId === opt.id : false;
                    const isWrongSelected = res ? isSelected && !res.correct : false;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          setSelectedByQ((prev) => ({ ...prev, [q.publicCode]: opt.id }))
                        }
                        className={cn(
                          'w-full flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all',
                          !locked && 'hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer',
                          locked && 'cursor-default',
                          !res && isSelected && 'border-blue-600 bg-blue-50/70',
                          !res && !isSelected && 'border-slate-200 bg-white',
                          res && isCorrectOpt && 'border-emerald-500 bg-emerald-50/70',
                          res && isWrongSelected && 'border-red-400 bg-red-50/70',
                          res && !isCorrectOpt && !isWrongSelected && 'border-slate-200 bg-slate-50/40 opacity-75'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold border',
                            !res && isSelected && 'border-blue-600 bg-blue-600 text-white',
                            !res && !isSelected && 'border-slate-300 bg-slate-50 text-slate-700',
                            res && isCorrectOpt && 'border-emerald-600 bg-emerald-600 text-white',
                            res && isWrongSelected && 'border-red-500 bg-red-500 text-white'
                          )}
                        >
                          {opt.optionLabel}
                        </span>
                        <span className="flex-1 pt-0.5 text-sm font-medium text-slate-900">
                          {opt.optionText}
                        </span>
                        {res && isCorrectOpt && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                        {res && isWrongSelected && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                      </button>
                    );
                  })}

                  {errorByQ[q.publicCode] && (
                    <p className="text-xs text-red-600 font-medium">{errorByQ[q.publicCode]}</p>
                  )}

                  {!locked && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        onClick={() => handleSubmitQuestion(q)}
                        disabled={!selectedId || !tokens[q.publicCode] || submittingCode === q.publicCode}
                        className="w-full sm:w-auto"
                      >
                        {submittingCode === q.publicCode ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Answer'
                        )}
                      </Button>
                    </div>
                  )}

                  {res && (
                    <div
                      className={cn(
                        'mt-3 rounded-xl border p-4 text-sm space-y-2',
                        res.correct
                          ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                          : 'border-amber-200 bg-amber-50/70 text-slate-900'
                      )}
                    >
                      <p className="font-semibold">
                        {res.correct
                          ? 'Correct!'
                          : `Correct Answer: ${res.correctOptionLabel}. ${res.correctOptionText}`}
                      </p>
                      {res.explanation && (
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          <span className="font-semibold text-blue-700">Explanation: </span>
                          {res.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Completion Summary */}
        {totalQuestions > 0 && answeredCount === totalQuestions && (
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50/50">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Award className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Quiz Completed!</h2>
              {knownResults.length > 0 && (
                <p className="text-sm text-slate-700">
                  Your local session score:{' '}
                  <span className="font-bold text-emerald-700">
                    {correctLocalCount} / {knownResults.length}
                  </span>{' '}
                  (stored only in your browser — never linked to your identity on the server).
                </p>
              )}
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <Link to="/feedback">
                  <Button>
                    <MessageSquareHeart className="h-4 w-4" />
                    Share Anonymous Feedback
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline">Back to Portal</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
