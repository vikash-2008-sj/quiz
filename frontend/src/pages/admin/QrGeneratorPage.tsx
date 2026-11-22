import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Check, Download, Printer, ExternalLink, QrCode, Smartphone } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import type { AdminQuizDetail, AdminQuizSummary } from '@/types';

export function QrGeneratorPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const [quizzes, setQuizzes] = useState<AdminQuizSummary[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(searchParams.get('quizId') || '');
  const [quizDetail, setQuizDetail] = useState<AdminQuizDetail | null>(null);
  const [mode, setMode] = useState<'quiz' | 'question'>(
    searchParams.get('questionId') ? 'question' : 'quiz'
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    searchParams.get('questionId') || ''
  );
  const [baseUrl, setBaseUrl] = useState<string>(() => window.location.origin);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.listQuizzes().then((list) => {
      setQuizzes(list);
      if (!selectedQuizId && list.length > 0) {
        setSelectedQuizId(String(list[0].id));
      }
    });
  }, [selectedQuizId]);

  useEffect(() => {
    if (!selectedQuizId) return;
    api.getQuiz(Number(selectedQuizId)).then((detail) => {
      setQuizDetail(detail);
      if (detail.questions.length > 0) {
        const match = detail.questions.find((q) => String(q.id) === selectedQuestionId);
        if (!match) {
          setSelectedQuestionId(String(detail.questions[0].id));
        }
      } else {
        setSelectedQuestionId('');
      }
    });
  }, [selectedQuizId, selectedQuestionId]);

  const selectedQuestion = useMemo(
    () => quizDetail?.questions.find((q) => String(q.id) === selectedQuestionId) || null,
    [quizDetail, selectedQuestionId]
  );

  const normalizedBase = baseUrl.trim().replace(/\/+$/, '') || window.location.origin;

  const shareUrl = useMemo(() => {
    if (!quizDetail) return '';
    if (mode === 'question' && selectedQuestion) {
      return `${normalizedBase}/q/${selectedQuestion.publicCode}`;
    }
    return `${normalizedBase}/quiz/${quizDetail.publicCode}`;
  }, [quizDetail, mode, selectedQuestion, normalizedBase]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: 'Shareable link copied to clipboard', variant: 'success' });
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    const slug =
      mode === 'question' && selectedQuestion
        ? selectedQuestion.publicCode
        : quizDetail?.publicCode || 'quiz';
    link.download = `${slug}-qr.png`;
    link.click();
    toast({ title: 'QR code PNG downloaded', variant: 'success' });
  };

  return (
    <AdminLayout
      title="QR Code Generator"
      subtitle="Generate scannable classroom QR codes and direct links for any quiz or single question"
      actions={
        <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
          <Printer className="h-4 w-4" />
          Print Poster
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Controls */}
        <Card className="lg:col-span-2 no-print">
          <CardHeader>
            <CardTitle>QR Target Settings</CardTitle>
            <CardDescription>
              Choose whether students open an entire quiz or jump directly to one MCQ question.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800">Select Quiz</label>
              <Select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.courseCode ? `[${q.courseCode}] ` : ''}
                    {q.title} ({q.status})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800">Target Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('quiz')}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === 'quiz'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Full Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setMode('question')}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === 'question'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Single Question
                </button>
              </div>
            </div>

            {mode === 'question' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-800">Select Question</label>
                {quizDetail && quizDetail.questions.length > 0 ? (
                  <Select
                    value={selectedQuestionId}
                    onChange={(e) => setSelectedQuestionId(e.target.value)}
                  >
                    {quizDetail.questions.map((q, idx) => (
                      <option key={q.id} value={q.id}>
                        Q{idx + 1}: {q.questionText.slice(0, 60)}
                        {q.questionText.length > 60 ? '...' : ''}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    This quiz has no questions yet. Add a question first.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800">Portal Base URL</label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://192.168.1.50:5173"
              />
              <p className="text-xs text-slate-500">
                Tip: Replace <code>localhost</code> with your campus LAN IP or deployed HTTPS domain so student phones can scan directly.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Printable QR Card */}
        <Card className="lg:col-span-3 shadow-md border-blue-100">
          <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
            {quizDetail ? (
              <>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {quizDetail.courseCode && <Badge variant="default">{quizDetail.courseCode}</Badge>}
                  <Badge variant={quizDetail.status === 'PUBLISHED' ? 'success' : 'warning'}>
                    {quizDetail.status}
                  </Badge>
                  <Badge variant="outline">
                    {mode === 'question' ? 'Single Question QR' : 'Full Quiz QR'}
                  </Badge>
                </div>

                <div className="space-y-1 max-w-lg">
                  <h2 className="text-xl font-bold text-slate-900">{quizDetail.title}</h2>
                  {mode === 'question' && selectedQuestion && (
                    <p className="text-sm text-slate-600">{selectedQuestion.questionText}</p>
                  )}
                </div>

                <div
                  ref={canvasWrapRef}
                  className="rounded-2xl border-2 border-blue-100 bg-white p-5 shadow-inner"
                >
                  {shareUrl ? (
                    <QRCodeCanvas
                      value={shareUrl}
                      size={260}
                      level="M"
                      includeMargin
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                    />
                  ) : (
                    <div className="flex h-64 w-64 items-center justify-center text-slate-400">
                      <QrCode className="h-12 w-12" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <span>Scan with your mobile camera — no student login required</span>
                </div>

                {shareUrl && (
                  <div className="w-full max-w-lg space-y-3 no-print">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <code className="flex-1 truncate text-xs text-slate-700 text-left">
                        {shareUrl}
                      </code>
                      <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                      <Button onClick={handleDownloadPng}>
                        <Download className="h-4 w-4" />
                        Download PNG
                      </Button>
                      <a href={shareUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline">
                          <ExternalLink className="h-4 w-4" />
                          Test Student Link
                        </Button>
                      </a>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="py-16 text-sm text-slate-500">Select a quiz to generate its QR code.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
