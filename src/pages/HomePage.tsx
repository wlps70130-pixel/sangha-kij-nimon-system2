import { useState, useEffect, useRef } from 'react';
import { Ceremony, Monk, AssignmentHistoryEntry, REJECTION_REASONS } from '@/lib/types';
import { loadCeremonies, saveCeremonies, loadMonks, saveMonks } from '@/lib/storage';
import { findSubstitute } from '@/lib/queueEngine';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon, MapPin, Phone, Users, Clock, ChevronRight, Info, Settings,
  BookOpen, UserCheck, BarChart3, FileText, Heart, Shield, Star, ChevronDown,
  CheckCircle, XCircle
} from 'lucide-react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CONTACT_INFO = {
  name: 'พระครูสถิตญาณธรรม',
  phone: '083-481-8456',
  line: '@temple-nimmon',
  address: 'วัดหลวงพ่อสดธรรมกายาราม ต.หน้าเมือง อ.เมือง จ.ราชบุรี 70000',
};

const SPECIAL_DATES = [
  { date: '2026-03-15', label: 'วันมาฆบูชา', type: 'buddhist' as const },
  { date: '2026-03-22', label: 'วันพระ', type: 'wan-phra' as const },
  { date: '2026-03-29', label: 'วันพระ', type: 'wan-phra' as const },
  { date: '2026-04-05', label: 'งานเททองหล่อพระ', type: 'event' as const },
  { date: '2026-04-13', label: 'วันสงกรานต์', type: 'buddhist' as const },
  { date: '2026-04-19', label: 'วันพระ', type: 'wan-phra' as const },
];

const rankBadgeVariant = (rank: string) => {
  switch (rank) {
    case 'มหาเถระ': return 'maha' as const;
    case 'เถระ': return 'thera' as const;
    case 'มัชฌิมะ': return 'majjhima' as const;
    case 'นวกะ': return 'navaka' as const;
    default: return 'default' as const;
  }
};

export default function HomePage() {
  const navigate = useNavigate();
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([]);
  const [monks, setMonks] = useState<Monk[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 2, 13));
  const [isMonkUser, setIsMonkUser] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ ceremonyId: string; monkId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCustomReason, setRejectCustomReason] = useState('');

  const laypeopleRef = useRef<HTMLElement>(null);
  const monkRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setCeremonies(loadCeremonies());
    setMonks(loadMonks());
  }, []);

  const confirmedCeremonies = ceremonies.filter(c => c.status === 'confirmed' || c.status === 'pending');

  const ceremoniesOnDate = confirmedCeremonies.filter(c => {
    try { return isSameDay(parseISO(c.date), selectedDate); } catch { return false; }
  });

  const ceremonyDates = confirmedCeremonies.map(c => {
    try { return parseISO(c.date); } catch { return null; }
  }).filter(Boolean) as Date[];

  const specialDatesThisMonth = SPECIAL_DATES.filter(s => {
    try {
      const d = parseISO(s.date);
      return isWithinInterval(d, { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) });
    } catch { return false; }
  });

  const getTypeStyle = (type: string, location?: string) => {
    if (type === 'อวมงคล') return { bg: 'bg-muted', text: 'text-muted-foreground', dot: '⬜' };
    if (location === 'ในวัด') return { bg: 'bg-secondary/10', text: 'text-secondary-foreground', dot: '🟡' };
    return { bg: 'bg-success/10', text: 'text-success', dot: '🟢' };
  };

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ═══════════════════════════════════════════════
  // MONK SELF-SERVICE ACTIONS
  // ═══════════════════════════════════════════════
  const loggedInMonk = monks[0]; // Demo: first monk

  const handleToggleAvailability = (available: boolean) => {
    if (!loggedInMonk) return;
    if (!available) {
      const reason = prompt('กรุณาระบุเหตุผลที่ไม่พร้อมรับงาน (เช่น กลับบ้าน, อาพาธ)');
      if (!reason || !reason.trim()) {
        toast.error('กรุณาระบุเหตุผล');
        return;
      }
      const updated = monks.map(m => m.id === loggedInMonk.id ? { ...m, availability: 'ไม่พร้อมรับงาน' as const, unavailableReason: reason.trim(), isFrozen: true } : m);
      setMonks(updated);
      saveMonks(updated);
      toast.info('🔴 ตั้งสถานะเป็น "ไม่พร้อมรับงาน"');
    } else {
      const updated = monks.map(m => m.id === loggedInMonk.id ? { ...m, availability: 'พร้อมรับงาน' as const, unavailableReason: undefined, isFrozen: false } : m);
      setMonks(updated);
      saveMonks(updated);
      toast.success('🟢 ตั้งสถานะเป็น "พร้อมรับงาน"');
    }
  };

  const handleChangeAcceptMode = (mode: string) => {
    if (!loggedInMonk) return;
    const updated = monks.map(m => m.id === loggedInMonk.id ? { ...m, acceptMode: mode as any } : m);
    setMonks(updated);
    saveMonks(updated);
    toast.success(`เปลี่ยนเป็น "${mode}"`);
  };

  const handleAcceptInvitation = (ceremonyId: string, monkId: string) => {
    const updatedCeremonies = ceremonies.map(c => {
      if (c.id !== ceremonyId) return c;
      return {
        ...c,
        assignments: c.assignments.map(a =>
          a.monk.id === monkId ? { ...a, status: 'approved' as const } : a
        ),
      };
    });
    const ceremony = updatedCeremonies.find(c => c.id === ceremonyId);
    if (ceremony && ceremony.assignments.every(a => a.status === 'approved')) {
      const finalCeremonies = updatedCeremonies.map(c =>
        c.id === ceremonyId ? { ...c, status: 'confirmed' as const } : c
      );
      setCeremonies(finalCeremonies);
      saveCeremonies(finalCeremonies);
    } else {
      setCeremonies(updatedCeremonies);
      saveCeremonies(updatedCeremonies);
    }
    const updatedMonks = monks.map(m => m.id === monkId ? { ...m, totalAssignments: m.totalAssignments + 1 } : m);
    setMonks(updatedMonks);
    saveMonks(updatedMonks);
    toast.success('✅ รับงานสำเร็จ');
  };

  const handleRejectInvitation = () => {
    if (!rejectDialog) return;
    const { ceremonyId, monkId } = rejectDialog;
    const reason = rejectReason === 'อื่นๆ' ? rejectCustomReason : rejectReason;
    if (!reason.trim()) {
      toast.error('กรุณาระบุเหตุผล');
      return;
    }

    const ceremony = ceremonies.find(c => c.id === ceremonyId);
    if (!ceremony) return;

    const excludeIds = new Set(ceremony.assignments.map(a => a.monk.id));
    const rejectedMonk = monks.find(m => m.id === monkId);
    const sub = findSubstitute(monks, ceremony.type as any, excludeIds, rejectedMonk?.rank);

    const updatedCeremonies = ceremonies.map(c => {
      if (c.id !== ceremonyId) return c;
      return {
        ...c,
        assignments: c.assignments.map(a => {
          if (a.monk.id !== monkId) return a;
          return { ...a, status: 'rejected' as const, rejectReason: reason, substitute: sub || undefined };
        }).concat(sub ? [{
          monk: sub, role: 'ผู้สวด' as const, status: 'pending' as const,
          rejectReason: undefined, substitute: undefined, sermonTopic: undefined,
        }] : []),
      };
    });

    setCeremonies(updatedCeremonies);
    saveCeremonies(updatedCeremonies);

    const updatedMonks = monks.map(m => {
      if (m.id !== monkId) return m;
      const historyEntry: AssignmentHistoryEntry = {
        ceremonyId, ceremonyName: ceremony.type, // Use type, not title for privacy
        date: ceremony.date, status: 'rejected', rejectReason: reason,
      };
      return { ...m, assignmentHistory: [...(m.assignmentHistory || []), historyEntry] };
    });
    setMonks(updatedMonks);
    saveMonks(updatedMonks);

    setRejectDialog(null);
    setRejectReason('');
    setRejectCustomReason('');
    toast.info(`❌ ปฏิเสธงาน${sub ? ` — ส่งคำเชิญไปยัง ${sub.name} แล้ว` : ''}`);
  };

  // Monk dashboard renderer
  const renderMonkDashboard = () => {
    if (!loggedInMonk) return <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>;

    const isAvailable = loggedInMonk.availability === 'พร้อมรับงาน';

    const pendingInvitations = ceremonies.filter(c =>
      c.status === 'pending' && c.assignments.some(a => a.monk.id === loggedInMonk.id && a.status === 'pending')
    );

    const myAssignments = confirmedCeremonies.filter(c =>
      c.assignments?.some(a => a.monk.id === loggedInMonk.id)
    );
    const now = new Date();
    const myMonthCount = myAssignments.filter(c => {
      try { const d = parseISO(c.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); } catch { return false; }
    }).length;

    return (
      <div className="space-y-4">
        {/* 1. Welcome Card */}
        <Card className="shadow-card border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20 shrink-0">
                <span className="text-2xl">🙏</span>
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-foreground leading-tight">
                  ยินดีต้อนรับ, {loggedInMonk.name}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant={rankBadgeVariant(loggedInMonk.rank)} className="text-xs">{loggedInMonk.rank}</Badge>
                  <Badge variant="outline" className="text-xs">พรรษา {loggedInMonk.yearsOrdained}</Badge>
                  <Badge variant="outline" className="text-xs">{loggedInMonk.building}</Badge>
                  {loggedInMonk.canLead && <Badge variant="gold" className="text-xs">หัวนำสวดได้</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 1.1 Availability & Preference Settings */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              ตั้งค่าสถานะความพร้อม
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{isAvailable ? '🟢' : '🔴'}</span>
                <div>
                  <p className="text-sm font-medium">{isAvailable ? 'พร้อมรับงาน' : 'ไม่พร้อมรับงาน'}</p>
                  {!isAvailable && loggedInMonk.unavailableReason && (
                    <p className="text-xs text-muted-foreground">เหตุผล: {loggedInMonk.unavailableReason}</p>
                  )}
                </div>
              </div>
              <Switch checked={isAvailable} onCheckedChange={handleToggleAvailability} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">โหมดรับงาน</Label>
              <Select value={loggedInMonk.acceptMode} onValueChange={handleChangeAcceptMode}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="รับงานทั่วไป">📋 รับงานทั่วไป (รันตามคิวปกติ)</SelectItem>
                  <SelectItem value="รับเฉพาะงานเจาะจง">🎯 รับเฉพาะงานที่โยมเจาะจงชื่อมาเท่านั้น</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 1.2 Pending Invitations — PRIVACY: No ceremony title shown */}
        {pendingInvitations.length > 0 && (
          <Card className="shadow-card border-primary/30 animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                📩 คำเชิญกิจนิมนต์ ({pendingInvitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvitations.map(c => {
                const myAssignment = c.assignments.find(a => a.monk.id === loggedInMonk.id && a.status === 'pending');
                if (!myAssignment) return null;
                return (
                  <div key={c.id} className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div>
                      {/* PRIVACY: Show only type, date, time, location — NO ceremony name */}
                      <p className="font-semibold text-sm">
                        {c.type} — {c.monkCount} รูป
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{c.date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.time || '-'}</span>
                        {c.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                        {c.ceremonyLocation && <span>({c.ceremonyLocation})</span>}
                      </div>
                      {myAssignment.role === 'หัวนำสวด' && (
                        <Badge variant="gold" className="text-xs mt-1">🎵 หน้าที่: หัวนำสวด</Badge>
                      )}
                      {/* Alms bowl badge */}
                      {c.hasAlmsBowlCeremony && (
                        <div className="mt-2 rounded-md border-2 border-accent/40 bg-accent/10 p-2 flex items-center gap-2">
                          <span className="text-lg">🪷</span>
                          <span className="text-xs font-semibold text-accent-foreground">
                            งานนี้มีพิธีตักบาตร (ต้องนำบาตรติดตัวไปด้วย)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="gold" size="sm" className="flex-1 gap-1" onClick={() => handleAcceptInvitation(c.id, loggedInMonk.id)}>
                        ✅ รับงาน
                      </Button>
                      <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={() => {
                        setRejectDialog({ ceremonyId: c.id, monkId: loggedInMonk.id });
                        setRejectReason('');
                        setRejectCustomReason('');
                      }}>
                        ❌ ปฏิเสธงาน
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Stats — show OWN score only */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-card">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mx-auto mb-2">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">คะแนนจิตพิสัยของท่าน</p>
              <p className="text-2xl font-bold text-primary">{loggedInMonk.activityScore || 0}</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 mx-auto mb-2">
                <BarChart3 className="h-5 w-5 text-success" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">กิจนิมนต์เดือนนี้</p>
              <p className="text-2xl font-bold text-success">{myMonthCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>สถิติออกงานสะสม</span>
              <span className="font-semibold">{loggedInMonk.totalAssignments} / 20 งาน (เป้าปี)</span>
            </div>
            <Progress value={Math.min((loggedInMonk.totalAssignments / 20) * 100, 100)} className="h-2.5" />
          </CardContent>
        </Card>

        {/* 1.3 Personal History */}
        {(loggedInMonk.assignmentHistory || []).length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                ประวัติการรับงานของท่าน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {(loggedInMonk.assignmentHistory || []).slice().reverse().map((h: AssignmentHistoryEntry, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{h.ceremonyName}</p>
                      <p className="text-muted-foreground">{h.date} {h.role ? `· ${h.role}` : ''}</p>
                      {/* Show ceremony title in history (unlocked) */}
                      {(() => {
                        const c = ceremonies.find(ce => ce.id === h.ceremonyId);
                        return c?.ceremonyTitle ? (
                          <p className="text-muted-foreground truncate">📌 {c.ceremonyTitle}</p>
                        ) : null;
                      })()}
                      {h.rejectReason && <p className="text-destructive">เหตุผล: {h.rejectReason}</p>}
                    </div>
                    <Badge variant={h.status === 'attended' ? 'success' : 'destructive'} className="text-[10px] shrink-0">
                      {h.status === 'attended' ? '✅ ไปงาน' : '❌ ปฏิเสธ'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full h-auto py-4 flex-col gap-2 bg-card hover:bg-primary/5 border-primary/20"
          onClick={() => navigate('/monk')}
        >
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold">📿 จัดการบทสวด (หน้าโปรไฟล์)</span>
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-maroon" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(43_74%_49%/0.15),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 container mx-auto max-w-4xl px-4 pt-10 pb-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 shadow-gold ring-4 ring-primary/20">
              <span className="text-4xl">🛕</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground tracking-tight leading-snug">
            ระบบบริหารกิจนิมนต์<br className="sm:hidden" />และตารางงานวัด
          </h1>
          <p className="text-sm text-primary-foreground/60 mt-2 max-w-md mx-auto">
            Temple Monk Invitation &amp; Scheduling Portal
          </p>

          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-primary-foreground/60">สลับมุมมอง:</span>
            <Button
              variant={!isMonkUser ? 'gold' : 'outline'}
              size="sm"
              className={cn("text-xs", !isMonkUser ? '' : 'bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20')}
              onClick={() => setIsMonkUser(false)}
            >
              👤 โยม
            </Button>
            <Button
              variant={isMonkUser ? 'gold' : 'outline'}
              size="sm"
              className={cn("text-xs", isMonkUser ? '' : 'bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20')}
              onClick={() => setIsMonkUser(true)}
            >
              🪷 พระ/เณร
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button variant="gold" size="lg" className="gap-2 text-base px-8 shadow-lg" onClick={() => scrollTo(laypeopleRef)}>
              🙏 ขอนิมนต์พระ
              <ChevronDown className="h-4 w-4" />
            </Button>
            {isMonkUser && (
              <Button
                variant="outline" size="lg"
                className="gap-2 text-base px-8 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 hover:text-primary-foreground"
                onClick={() => scrollTo(monkRef)}
              >
                🪷 ดูแดชบอร์ดส่วนตัว
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Quick Nav */}
      <div className="container mx-auto max-w-4xl px-4 -mt-4 relative z-10">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button variant="gold" size="sm" className="gap-1 shrink-0">
            <CalendarIcon className="h-4 w-4" /> หน้าหลัก
          </Button>
          <Button variant="outline" size="sm" className="gap-1 shrink-0 bg-card" onClick={() => navigate('/admin')}>
            <Settings className="h-4 w-4" /> Admin
          </Button>
          <Button variant="outline" size="sm" className="gap-1 shrink-0 bg-card" onClick={() => navigate('/queue')}>
            <Users className="h-4 w-4" /> ดูคิว
          </Button>
          <Button variant="outline" size="sm" className="gap-1 shrink-0 bg-card" onClick={() => navigate('/history')}>
            <Clock className="h-4 w-4" /> ประวัติ
          </Button>
        </div>
      </div>

      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-10">

        {/* MONK DASHBOARD */}
        {isMonkUser && (
          <>
            <section ref={monkRef}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">แดชบอร์ดส่วนตัวคณะสงฆ์</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                ตั้งค่าสถานะ · ดูคำเชิญ · รับหรือปฏิเสธงานด้วยตนเอง
              </p>
              {renderMonkDashboard()}
            </section>
            <Separator />
          </>
        )}

        {/* PUBLIC CALENDAR */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">ปฏิทินงานบุญประจำวัด</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            กรุณาตรวจสอบตารางงานก่อนทำการขอนิมนต์ — วันที่มีขีดเส้นใต้คือวันที่มีงาน
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Calendar */}
            <Card className="shadow-card border-gold-subtle lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  {format(selectedDate, 'MMMM yyyy', { locale: th })}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-1 sm:px-4">
                <div className="w-full [&_.rdp]:w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-head_cell]:text-sm [&_.rdp-head_cell]:w-auto [&_.rdp-head_cell]:flex-1 [&_.rdp-cell]:w-auto [&_.rdp-cell]:flex-1 [&_.rdp-cell]:h-12 [&_.rdp-day]:w-full [&_.rdp-day]:h-12 [&_.rdp-day]:text-base [&_.rdp-head_row]:flex [&_.rdp-row]:flex [&_.rdp-caption]:text-lg">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    defaultMonth={new Date(2026, 2)}
                    className="p-3 pointer-events-auto w-full"
                    modifiers={{ ceremony: ceremonyDates }}
                    modifiersStyles={{
                      ceremony: {
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                        textDecorationColor: 'hsl(16, 65%, 45%)',
                      },
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-3 px-2">
                  <span className="flex items-center gap-1">🟢 มงคลนอกวัด</span>
                  <span className="flex items-center gap-1">🟡 งานในวัด</span>
                  <span className="flex items-center gap-1">⬜ อวมงคล</span>
                  <span className="flex items-center gap-1">🔴 วันสำคัญ</span>
                </div>
              </CardContent>
            </Card>

            {/* Selected Date Details */}
            <Card className="shadow-card lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  📅 {format(selectedDate, 'PPPPp', { locale: th }).split(' เวลา')[0]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {SPECIAL_DATES.filter(s => {
                  try { return isSameDay(parseISO(s.date), selectedDate); } catch { return false; }
                }).map((s, i) => (
                  <div key={i} className="rounded-lg p-3 bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-semibold text-destructive">🔴 {s.label}</p>
                  </div>
                ))}

                {ceremoniesOnDate.length === 0 && (
                  <div className="text-center py-6">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">ไม่มีงานนิมนต์ในวันนี้</p>
                  </div>
                )}

                {ceremoniesOnDate.map(c => {
                  const style = getTypeStyle(c.type, c.ceremonyLocation);
                  return (
                    <div key={c.id} className={`rounded-lg p-3 ${style.bg} border`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-semibold text-sm ${style.text}`}>
                            {style.dot} {c.type} — {c.monkCount} รูป
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            🕐 {c.time || '-'} · {c.requesterName}
                          </p>
                          {c.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {c.location}
                            </p>
                          )}
                          {c.ceremonyLocation && (
                            <Badge variant="outline" className="text-[10px] mt-1">{c.ceremonyLocation}</Badge>
                          )}
                        </div>
                        <Badge variant={c.status === 'confirmed' ? 'success' : 'warning'} className="shrink-0 text-[10px]">
                          {c.status === 'confirmed' ? 'ยืนยัน' : 'รอ'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}

                {specialDatesThisMonth.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-semibold mb-1.5">📌 วันสำคัญในเดือนนี้</p>
                    <div className="space-y-1">
                      {specialDatesThisMonth.map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          • {(() => { try { return format(parseISO(s.date), 'd MMM', { locale: th }); } catch { return s.date; } })()} — {s.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact info card */}
          <Card className="mt-4 shadow-card bg-primary/5 border-primary/20">
            <CardContent className="py-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold">ติดต่อสอบถาม:</span>
              <span>{CONTACT_INFO.name}</span>
              <a href={`tel:${CONTACT_INFO.phone.replace(/-/g, '')}`} className="text-primary font-semibold flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {CONTACT_INFO.phone}
              </a>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* LAYPEOPLE SECTION */}
        <section ref={laypeopleRef}>
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">ขอนิมนต์พระและคู่มือเตรียมงาน</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            กรอกแบบฟอร์มเพื่อขอนิมนต์พระ พร้อมศึกษาคู่มือเตรียมงานบุญ
          </p>

          <Button
            variant="gold" size="lg"
            className="w-full gap-2 text-base shadow-gold mb-5"
            onClick={() => navigate('/request')}
          >
            <FileText className="h-5 w-5" />
            📝 กรอกแบบฟอร์มขอนิมนต์พระ
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="shadow-card border-success/30 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 mb-2">
                  <span className="text-2xl">🟢</span>
                </div>
                <CardTitle className="text-base">คู่มือเตรียมงานมงคล</CardTitle>
                <CardDescription className="text-xs">ทำบุญบ้าน, ขึ้นบ้านใหม่, มงคลสมรส, งานบวช</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="items" className="border-none">
                    <AccordionTrigger className="text-sm py-2">สิ่งที่ต้องเตรียม</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>โต๊ะหมู่บูชา พร้อมพระพุทธรูป</li>
                        <li>ดอกไม้ ธูป เทียน</li>
                        <li>น้ำมนต์ (ขันสาคร) + สายสิญจน์</li>
                        <li>ภัตตาหาร / สังฆทาน</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card className="shadow-card border-muted hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-2">
                  <span className="text-2xl">⬜</span>
                </div>
                <CardTitle className="text-base">คู่มือเตรียมงานอวมงคล</CardTitle>
                <CardDescription className="text-xs">งานศพ, ทำบุญ 7/50/100 วัน</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="items" className="border-none">
                    <AccordionTrigger className="text-sm py-2">สิ่งที่ต้องเตรียม</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>โต๊ะหมู่บูชา พร้อมรูปผู้ล่วงลับ</li>
                        <li>ดอกไม้จันทน์ ธูป เทียน</li>
                        <li>สังฆทาน / ชุดไทยธรรม</li>
                        <li>ภัตตาหาร</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* FOOTER */}
        <footer className="rounded-xl bg-card border shadow-card p-6 space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            ช่องทางติดต่อวัด
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{CONTACT_INFO.name}</p>
                <a href={`tel:${CONTACT_INFO.phone}`} className="text-sm text-primary flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {CONTACT_INFO.phone}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 shrink-0">
                <span className="text-lg">💬</span>
              </div>
              <div>
                <p className="font-semibold text-sm">LINE Official</p>
                <p className="text-sm text-muted-foreground">{CONTACT_INFO.line}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">แผนที่วัด</p>
                <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                  เปิดใน Google Maps
                </a>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{CONTACT_INFO.address}</p>

          <Separator />

          <p className="text-center text-xs text-muted-foreground">
            ระบบบริหารจัดการกิจนิมนต์ © {new Date().getFullYear()} — พัฒนาเพื่อความโปร่งใสและเป็นธรรม
          </p>
        </footer>
      </main>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              ระบุเหตุผลที่ปฏิเสธงาน
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={rejectReason} onValueChange={setRejectReason}>
              <SelectTrigger><SelectValue placeholder="เลือกเหตุผล" /></SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rejectReason === 'อื่นๆ' && (
              <Textarea
                placeholder="พิมพ์เหตุผลเพิ่มเติม..."
                value={rejectCustomReason}
                onChange={(e) => setRejectCustomReason(e.target.value)}
                rows={3}
              />
            )}
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={handleRejectInvitation}>
                ❌ ยืนยันปฏิเสธ
              </Button>
              <Button variant="outline" onClick={() => setRejectDialog(null)}>ยกเลิก</Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ ระบบจะหาพระท่านอื่นมาแทนให้โดยอัตโนมัติ
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
