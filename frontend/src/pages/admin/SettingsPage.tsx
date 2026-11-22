import React, { useEffect, useState } from 'react';
import { Save, KeyRound, ShieldAlert, History, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog, PortalSettings } from '@/types';

export function SettingsPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    Promise.all([api.getSettings(), api.getAuditLogs(30)])
      .then(([s, logs]) => {
        setSettings(s);
        setAuditLogs(logs);
      })
      .catch((err) => {
        toast({
          title: 'Failed to load settings',
          description: err instanceof ApiError ? err.message : 'Admin access required.',
          variant: 'error',
        });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const updated = await api.updateSettings({
        collegeName: settings.collegeName,
        portalTitle: settings.portalTitle,
        publicBaseUrl: settings.publicBaseUrl,
        allowAnonymousFeedback: settings.allowAnonymousFeedback,
        rateLimitPerMinute: settings.rateLimitPerMinute,
        privacyNotice: settings.privacyNotice,
      });
      setSettings(updated);
      const logs = await api.getAuditLogs(30);
      setAuditLogs(logs);
      toast({ title: 'Portal settings updated', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof ApiError ? err.message : 'Check form inputs.',
        variant: 'error',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'error' });
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password updated successfully', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Password change failed',
        description: err instanceof ApiError ? err.message : 'Unable to update password.',
        variant: 'error',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AdminLayout
      title="Portal Settings & Audit Log"
      subtitle="Configure institutional branding, QR base URL, privacy disclosures, and security"
    >
      {loading || !settings ? (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Portal Config */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Institutional &amp; QR Configuration</CardTitle>
                <CardDescription>
                  Changes apply immediately across the student portal and generated QR links.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-800">College Name</label>
                      <Input
                        value={settings.collegeName}
                        onChange={(e) =>
                          setSettings({ ...settings, collegeName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-800">Portal Title</label>
                      <Input
                        value={settings.portalTitle}
                        onChange={(e) =>
                          setSettings({ ...settings, portalTitle: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-800">
                        Public Base URL (for QR Codes)
                      </label>
                      <Input
                        value={settings.publicBaseUrl}
                        onChange={(e) =>
                          setSettings({ ...settings, publicBaseUrl: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-800">
                        Rate Limit (Requests / Min)
                      </label>
                      <Input
                        type="number"
                        min={10}
                        max={1000}
                        value={settings.rateLimitPerMinute}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            rateLimitPerMinute: Number(e.target.value) || 60,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowAnonymousFeedback}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          allowAnonymousFeedback: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-blue-600"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-slate-900">
                        Accept Anonymous Student Feedback
                      </span>
                      <span className="block text-xs text-slate-500">
                        When disabled, the public feedback form displays a temporary pause notice.
                      </span>
                    </div>
                  </label>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-800">
                      Student Privacy Notice &amp; Limitations Disclosure
                    </label>
                    <Textarea
                      value={settings.privacyNotice}
                      onChange={(e) =>
                        setSettings({ ...settings, privacyNotice: e.target.value })
                      }
                      rows={4}
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400">
                      Last updated {formatDateTime(settings.updatedAt)}
                    </span>
                    <Button type="submit" disabled={savingSettings}>
                      {savingSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Change Password + Privacy Limitation Reminder */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    Change Password
                  </CardTitle>
                  <CardDescription>Rotate your administrator account credentials.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="New password (min 8 chars)"
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <Button type="submit" variant="outline" disabled={savingPassword} className="w-full">
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-amber-900">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Documented Privacy Limitations
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-amber-900/90 space-y-2 leading-relaxed">
                  <p>
                    The application database intentionally stores no student names, emails, roll numbers, or IP addresses alongside quiz answers or anonymous feedback.
                  </p>
                  <p>
                    However, absolute anonymity cannot be guaranteed if external infrastructure (reverse proxies, load balancers, campus Wi-Fi NAT, or hosting provider logs) logs IP addresses or timestamps. Configure web servers to strip IP logs on <code>/api/public/feedback</code> in production.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Audit Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Recent Administrative Audit Logs
              </CardTitle>
              <CardDescription>
                Tracks administrative actions only — never logs student responses or anonymous feedback submitters.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-y border-slate-100 bg-slate-50/80 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Timestamp</th>
                      <th className="px-4 py-3 font-semibold">Actor</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                      <th className="px-5 py-3 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {log.actorEmail || 'System'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{log.action}</Badge>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{log.details || '—'}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
