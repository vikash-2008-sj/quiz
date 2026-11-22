import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, ArrowRight, Home } from 'lucide-react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import type { FeedbackConfirmation } from '@/types';

export function FeedbackConfirmationPage() {
  const location = useLocation();
  const state = location.state as FeedbackConfirmation | null;

  return (
    <StudentLayout>
      <Card className="mx-auto max-w-xl text-center shadow-md border-emerald-200/80">
        <CardContent className="p-8 sm:p-10 space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Feedback Submitted Anonymously</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {state?.message ||
                'Thank you for sharing your voice. Your anonymous feedback has been delivered to college administrators without any student identity.'}
            </p>
          </div>

          {state && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-xs sm:text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Category</span>
                <span className="font-semibold text-slate-900">{state.categoryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded At</span>
                <span className="font-medium text-slate-800">{formatDateTime(state.submittedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Identity Stored</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  None (Anonymous)
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
            <Link to="/feedback">
              <Button className="w-full sm:w-auto">
                Submit Another Feedback
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full sm:w-auto">
                <Home className="h-4 w-4" />
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </StudentLayout>
  );
}
