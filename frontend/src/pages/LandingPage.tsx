import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  QrCode,
  MessageSquareHeart,
  ShieldCheck,
  ArrowRight,
  Lock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');

  const handleOpenCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = accessCode.trim();
    if (!cleaned) {
      setError('Enter a quiz code (e.g., qz-cs201dsa) or question code (e.g., qn-dsa10001).');
      return;
    }
    setError('');
    if (cleaned.startsWith('qn-')) {
      navigate(`/q/${encodeURIComponent(cleaned)}`);
    } else if (cleaned.startsWith('qz-')) {
      navigate(`/quiz/${encodeURIComponent(cleaned)}`);
    } else {
      navigate(`/quiz/${encodeURIComponent(cleaned)}`);
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-8">
        {/* Hero */}
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-7 text-white shadow-lg sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-50 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>QR-Powered Classroom Quizzes &amp; Confidential Campus Feedback</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-4xl">
            College Quiz &amp; Anonymous Feedback Portal
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
            Scan your instructor&apos;s QR code to participate in live conceptual MCQs with instant post-submission
            explanations, or share honest, identity-free feedback to help improve academics and campus life.
          </p>

          <form onSubmit={handleOpenCode} className="mt-6 flex flex-col gap-3 sm:flex-row sm:max-w-lg">
            <Input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter quiz or question code (e.g. qz-cs201dsa)"
              className="h-11 bg-white text-slate-900 border-0 shadow-sm"
            />
            <Button
              type="submit"
              size="lg"
              className="bg-slate-900 text-white hover:bg-slate-800 shrink-0"
            >
              Open Quiz
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          {error && <p className="mt-2 text-xs text-amber-200">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-blue-100">
            <span>Quick demo links:</span>
            <Link
              to="/quiz/qz-cs201dsa"
              className="rounded-md bg-white/15 px-2.5 py-1 font-medium text-white hover:bg-white/25 transition-colors"
            >
              CS201 Quiz (qz-cs201dsa)
            </Link>
            <Link
              to="/q/qn-dsa10001"
              className="rounded-md bg-white/15 px-2.5 py-1 font-medium text-white hover:bg-white/25 transition-colors"
            >
              Single Question (qn-dsa10001)
            </Link>
          </div>
        </section>

        {/* Two Student Portals */}
        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-slate-200 hover:border-blue-200 transition-colors">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-2">
                <QrCode className="h-6 w-6" />
              </div>
              <CardTitle>Student Quiz Access</CardTitle>
              <CardDescription>
                Join classroom MCQ polls directly via QR scan or shared link — no account registration needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Correct answers and explanations unlock only after your submission.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>One-time privacy-preserving tokens prevent duplicate votes without tracking identities.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>Instructors see aggregate class statistics only — never individual answers.</span>
              </div>
              <div className="pt-2">
                <Link to="/quiz/qz-cs201dsa">
                  <Button variant="outline" className="w-full">
                    Try Sample CS201 Quiz
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:border-blue-200 transition-colors">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-2">
                <MessageSquareHeart className="h-6 w-6" />
              </div>
              <CardTitle>Anonymous College Feedback</CardTitle>
              <CardDescription>
                Share constructive feedback about teaching quality, laboratories, classrooms, academics, or facilities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span>No student login, roll number, email, or IP address is stored with your feedback.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span>Strictly accessible only to authorized college administrators — never teaching staff.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span>Categorized and reviewed systematically to drive real campus improvements.</span>
              </div>
              <div className="pt-2">
                <Link to="/feedback">
                  <Button className="w-full">
                    Submit Anonymous Feedback
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Admin CTA */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-300">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Faculty &amp; Administrator Console</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Create quizzes, print classroom QR codes, review aggregate option analytics, and manage campus feedback.
                </p>
              </div>
            </div>
            <Link to="/admin/login">
              <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">
                Sign In to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
