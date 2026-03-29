import { useState } from 'react';
import { CeremonyType, CeremonyLocation, Ceremony, Assignment, QUOTA_CONFIGS, CeremonyRequest, Monk, AssignmentHistoryEntry, TemplePreparationMode } from '@/lib/types';
import { CHANT_CATEGORIES } from '@/lib/chantingData';
import { generateAssignments, findSubstitute } from '@/lib/queueEngine';
import { loadMonks, saveMonks, loadCeremonies, saveCeremonies, loadRequests, saveRequests } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Users, CalendarIcon, Sparkles, FileText, ChevronRight, Clock, MapPin, Settings, Package, CheckCircle, XCircle, Info, History, UserCheck, Globe, Search, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const MONK_COUNTS = [3, 4, 5, 7, 9, 10];

const rankBadgeVariant = (rank: string) => {
  switch (rank) {
    case 'มหาเถระ': return 'maha' as const;
    case 'เถระ': return 'thera' as const;
    case 'มัชฌิมะ': return 'majjhima' as const;
    case 'นวกะ': return 'navaka' as const;
    default: return 'default' as const;
  }
};

const SUGGESTED_ITEMS: Partial<Record<CeremonyType, string>> = {
  'มงคล': '- น้ำมนต์ (ขัน/ถัง)\n- ด้ายสายสิญจน์\n- ดอกไม้ ธูป เทียน\n- ภัตตาหาร\n- น้ำดื่ม',
  'อวมงคล': '- สังฆทาน\n- ดอกไม้ ธูป เทียน\n- ภัตตาหาร\n- น้ำดื่ม\n- ผ้าบังสุกุล',
  'ใส่บาตรและเจริญพระพุทธมนต์': '- ข้าวสาร อาหารแห้ง\n- ดอกไม้ ธูป เทียน',
};

const SUGGESTED_TIME: Partial<Record<CeremonyType, string>> = {
  'มงคล': 'แนะนำ: เช้า 09:00 น. หรือ สาย 10:30 น.',
  'อวมงคล': 'แนะนำ: เช้า 07:00 น. หรือ บ่าย 14:00 น.',
  'ใส่บาตรและเจริญพระพุทธมนต์': 'แนะนำ: เช้า 06:30-07:30 น.',
};

const TEMPLE_ORIGIN = 'วัดหลวงพ่อสดธรรมกายาราม';

export default function AdminPage() {
  const navigate = useNavigate();
  const [ceremonyType, setCeremonyType] = useState<CeremonyType>('มงคล');
  const [monkCount, setMonkCount] = useState<number>(5);
  const [requesterName, setRequesterName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [ceremonyTitle, setCeremonyTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [ceremonyLocation, setCeremonyLocation] = useState<CeremonyLocation>('นอกวัด');
  const [selectedChantIds, setSelectedChantIds] = useState<Set<string>>(new Set());
  const [specifiedMonkIds, setSpecifiedMonkIds] = useState<Set<string>>(new Set());
  const [suggestedItems, setSuggestedItems] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [needTemplePreparation, setNeedTemplePreparation] = useState(false);
  const [templePreparationMode, setTemplePreparationMode] = useState<TemplePreparationMode>('เจ้าภาพเตรียมเอง');
  const [templePreparationItems, setTemplePreparationItems] = useState<Set<string>>(new Set());
  const [draftAssignments, setDraftAssignments] = useState<Assignment[] | null>(null);
  const [ceremonies, setCeremonies] = useState(() => loadCeremonies());
  const [requests, setRequests] = useState(() => loadRequests());
  const [showChants, setShowChants] = useState(false);
  const [showMonkSelect, setShowMonkSelect] = useState(false);
  const [isOpenForAll, setIsOpenForAll] = useState(false);
  const [historyMonk, setHistoryMonk] = useState<Monk | null>(null);
  const [managingCeremony, setManagingCeremony] = useState<Ceremony | null>(null);
  const [monks, setMonksState] = useState(() => loadMonks());
  const [hasAlmsBowlCeremony, setHasAlmsBowlCeremony] = useState(false);
  const [mealOption, setMealOption] = useState<'ไม่มี' | 'ภัตตาหาร'>('ไม่มี');
  const [diningStyle, setDiningStyle] = useState('ฉันวง');
  const [diningOtherDetails, setDiningOtherDetails] = useState('');
  const [viewingRequest, setViewingRequest] = useState<CeremonyRequest | null>(null);

  const estimatedDistance = location ? `จาก ${TEMPLE_ORIGIN} → ใช้เวลาเดินทางประมาณ ${Math.floor(Math.random() * 40 + 20)} นาที` : '';

  const handleGenerate = () => {
    try {
      const assignments = generateAssignments(monks, ceremonyType, monkCount, specifiedMonkIds.size > 0 ? specifiedMonkIds : undefined);
      // Sort: หัวนำสวด first, then by yearsOrdained desc
      const sorted = [...assignments].sort((a, b) => {
        if (a.role === 'หัวนำสวด' && b.role !== 'หัวนำสวด') return -1;
        if (b.role === 'หัวนำสวด' && a.role !== 'หัวนำสวด') return 1;
        return b.monk.yearsOrdained - a.monk.yearsOrdained;
      });
      setDraftAssignments(sorted);
      toast.success('🤖 จัดรายชื่อตามคิวสำเร็จ!');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleConfirmDraft = () => {
    if (!draftAssignments && !isOpenForAll) return;
    const newCeremony: Ceremony = {
      id: `c${Date.now()}`,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
      time,
      type: ceremonyType,
      monkCount: isOpenForAll ? monks.length : monkCount,
      requesterName: requesterName || 'ไม่ระบุ',
      description: description || '-',
      ceremonyTitle: ceremonyTitle || undefined,
      assignments: isOpenForAll ? [] : (draftAssignments || []).map(a => ({ ...a, status: 'pending' as const })),
      status: isOpenForAll ? 'confirmed' : 'pending',
      createdAt: new Date().toISOString(),
      location: location || undefined,
      locationUrl: locationUrl || undefined,
      ceremonyLocation,
      selectedChantIds: selectedChantIds.size > 0 ? Array.from(selectedChantIds) : undefined,
      suggestedItems: suggestedItems || SUGGESTED_ITEMS[ceremonyType] || '',
      suggestedTime: suggestedTime || SUGGESTED_TIME[ceremonyType] || '',
      needTemplePreparation,
      templePreparationMode: ceremonyLocation === 'ในวัด' ? templePreparationMode : undefined,
      templePreparationItems: templePreparationItems.size > 0 ? Array.from(templePreparationItems) : undefined,
      isOpenForAll,
      checkInResults: isOpenForAll ? monks.map(m => ({ monkId: m.id, attended: false })) : undefined,
      phoneNumber: phoneNumber || undefined,
      hasAlmsBowlCeremony,
      mealOption: mealOption || undefined,
      diningStyle: mealOption !== 'ไม่มี' ? diningStyle as any : undefined,
      diningOtherDetails: diningOtherDetails || undefined,
    };
    const updated = [newCeremony, ...ceremonies];
    setCeremonies(updated);
    saveCeremonies(updated);
    // Reset form
    setDraftAssignments(null);
    setRequesterName(''); setPhoneNumber(''); setDescription(''); setCeremonyTitle('');
    setLocation(''); setLocationUrl(''); setSelectedDate(undefined);
    setSelectedChantIds(new Set()); setSpecifiedMonkIds(new Set());
    setNeedTemplePreparation(false); setTemplePreparationItems(new Set());
    setIsOpenForAll(false); setHasAlmsBowlCeremony(false);
    setMealOption('ไม่มี'); setDiningStyle('ฉันวง'); setDiningOtherDetails('');
    setTemplePreparationMode('เจ้าภาพเตรียมเอง');
    toast.success(isOpenForAll ? '✅ สร้างงานส่วนรวมเรียบร้อย' : '✅ ส่งคำเชิญไปยังพระ/สามเณรเรียบร้อย');
  };

  const handleCompleteCeremony = (ceremony: Ceremony) => {
    const ceremonyName = ceremony.ceremonyTitle || ceremony.description || `${ceremony.type} — ${ceremony.monkCount} รูป`;
    let updatedMonks = [...monks];

    if (ceremony.isOpenForAll && ceremony.checkInResults) {
      for (const entry of ceremony.checkInResults) {
        updatedMonks = updatedMonks.map(m => {
          if (m.id !== entry.monkId) return m;
          const historyEntry: AssignmentHistoryEntry = {
            ceremonyId: ceremony.id, ceremonyName, date: ceremony.date,
            status: entry.attended ? 'attended' : 'rejected',
          };
          return {
            ...m,
            assignmentHistory: [...(m.assignmentHistory || []), historyEntry],
            activityScore: entry.attended ? (m.activityScore || 0) + 1 : (m.activityScore || 0),
          };
        });
      }
    } else {
      for (const a of ceremony.assignments) {
        const wasSubstituted = a.status === 'substituted' || a.status === 'rejected';
        updatedMonks = updatedMonks.map(m => {
          if (m.id !== a.monk.id) return m;
          const historyEntry: AssignmentHistoryEntry = {
            ceremonyId: ceremony.id, ceremonyName, date: ceremony.date,
            status: wasSubstituted ? 'substituted' : 'attended',
            role: a.role, rejectReason: a.rejectReason,
          };
          return {
            ...m,
            assignmentHistory: [...(m.assignmentHistory || []), historyEntry],
          };
        });
      }
    }

    setMonksState(updatedMonks);
    saveMonks(updatedMonks);
    const updatedCeremonies = ceremonies.map(c =>
      c.id === ceremony.id ? { ...c, status: 'completed' as const } : c
    );
    setCeremonies(updatedCeremonies);
    saveCeremonies(updatedCeremonies);
    setManagingCeremony(null);
    toast.success('✅ บันทึกจบงานและประวัติเรียบร้อย');
  };

  const toggleCheckIn = (ceremonyId: string, monkId: string) => {
    const updatedCeremonies = ceremonies.map(c => {
      if (c.id !== ceremonyId || !c.checkInResults) return c;
      return { ...c, checkInResults: c.checkInResults.map(cr => cr.monkId === monkId ? { ...cr, attended: !cr.attended } : cr) };
    });
    setCeremonies(updatedCeremonies);
    saveCeremonies(updatedCeremonies);
    if (managingCeremony?.id === ceremonyId) {
      setManagingCeremony(updatedCeremonies.find(c => c.id === ceremonyId) || null);
    }
  };

  const handleApproveRequest = (req: CeremonyRequest) => {
    setRequesterName(req.requesterName);
    setPhoneNumber(req.phoneNumber || '');
    setCeremonyType(req.ceremonyType);
    setCeremonyTitle(req.ceremonyTitle || '');
    setMonkCount(req.monkCount);
    setDescription(req.description);
    setLocation(req.location);
    setLocationUrl(req.locationUrl || '');
    setTime(req.time);
    setCeremonyLocation(req.ceremonyLocation);
    setNeedTemplePreparation(req.needTemplePreparation);
    setTemplePreparationMode(req.templePreparationMode || 'เจ้าภาพเตรียมเอง');
    if (req.templePreparationItems) setTemplePreparationItems(new Set(req.templePreparationItems));
    setHasAlmsBowlCeremony(req.hasAlmsBowlCeremony || false);
    setMealOption(req.mealOption || 'ไม่มี');
    setDiningStyle(req.diningStyle || 'ฉันวง');
    setDiningOtherDetails(req.diningOtherDetails || '');
    if (req.date) { try { setSelectedDate(new Date(req.date)); } catch {} }
    const updatedReqs = requests.map(r => r.id === req.id ? { ...r, status: 'approved' as const } : r);
    setRequests(updatedReqs);
    saveRequests(updatedReqs);
    setViewingRequest(null);
    toast.success('โหลดข้อมูลจากคำขอเรียบร้อย กรุณากดจัดรายชื่อ');
  };

  const handleRejectRequest = (reqId: string) => {
    const updatedReqs = requests.map(r => r.id === reqId ? { ...r, status: 'rejected' as const } : r);
    setRequests(updatedReqs);
    saveRequests(updatedReqs);
    setViewingRequest(null);
    toast.success('ปฏิเสธคำขอเรียบร้อย');
  };

  const pendingRequests = requests.filter(r => r.status === 'waiting');

  const toggleChant = (id: string) => {
    setSelectedChantIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const togglePrepItem = (item: string) => {
    setTemplePreparationItems(prev => { const next = new Set(prev); if (next.has(item)) next.delete(item); else next.add(item); return next; });
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 10) setPhoneNumber(val);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-maroon px-4 py-6 shadow-lg">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <span className="text-xl">🛕</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">ระบบบริหารจัดการกิจนิมนต์</h1>
              <p className="text-sm text-primary-foreground/70">Admin — สร้างงานและจัดรายชื่อ</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button variant="gold" size="sm" className="gap-1">
            <Settings className="h-4 w-4" /> Admin
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate('/')}>
            <CalendarIcon className="h-4 w-4" /> หน้าหลัก
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate('/queue')}>
            <Users className="h-4 w-4" /> ดูคิว
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate('/history')}>
            <Clock className="h-4 w-4" /> ประวัติ
          </Button>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="shadow-card border-primary/30 animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                🙏 คำขอนิมนต์จากโยม ({pendingRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="rounded-lg border p-4 space-y-2 bg-primary/5 border-primary/20">
                  <div>
                    <p className="font-semibold">{req.requesterName} — {req.ceremonyType} ({req.monkCount} รูป)</p>
                    <p className="text-xs text-muted-foreground">{req.date} · {req.time} · {req.location} · {req.ceremonyLocation}</p>
                    {req.phoneNumber && <p className="text-xs text-muted-foreground">📞 {req.phoneNumber}</p>}
                    {req.hasAlmsBowlCeremony && (
                      <Badge variant="warning" className="text-xs mt-1">🪷 มีพิธีตักบาตร</Badge>
                    )}
                    {req.needTemplePreparation && req.templePreparationItems && (
                      <p className="text-xs text-muted-foreground mt-1">📦 ผาติกรรม: {req.templePreparationItems.join(', ')}</p>
                    )}
                    {req.specifiedMonkNames && (
                      <p className="text-xs text-primary mt-1">👤 เจาะจง: {req.specifiedMonkNames}</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setViewingRequest(req)}>
                      <Info className="h-4 w-4" /> ดูรายละเอียด
                    </Button>
                    <Button variant="gold" size="sm" className="gap-1" onClick={() => handleApproveRequest(req)}>
                      <CheckCircle className="h-4 w-4" /> รับคำขอ & สร้างงาน
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleRejectRequest(req.id)}>
                      <XCircle className="h-4 w-4" /> ปฏิเสธ
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Create Ceremony Form */}
        <Card className="shadow-card border-gold-subtle animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
              สร้างงานกิจนิมนต์ใหม่
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ceremony Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ประเภทงาน</Label>
                <Select value={ceremonyType} onValueChange={(v) => {
                  setCeremonyType(v as CeremonyType);
                  if (v === 'งานส่วนรวมของวัด') setIsOpenForAll(true);
                  else setIsOpenForAll(false);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="มงคล">🟢 งานมงคล</SelectItem>
                    <SelectItem value="อวมงคล">🔴 งานอวมงคล</SelectItem>
                    <SelectItem value="ใส่บาตรและเจริญพระพุทธมนต์">🟡 ใส่บาตรและเจริญพระพุทธมนต์</SelectItem>
                    <SelectItem value="งานส่วนรวมของวัด">🏛️ งานส่วนรวมของวัด</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!isOpenForAll && (
                <div className="space-y-2">
                  <Label>จำนวนพระ</Label>
                  <Select value={String(monkCount)} onValueChange={(v) => setMonkCount(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONK_COUNTS.map(n => (
                        <SelectItem key={n} value={String(n)}>{n} รูป</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {isOpenForAll && (
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">งานส่วนรวม (Open for All)</p>
                  <p className="text-xs text-muted-foreground">ไม่จำกัดโควตา — เช็กชื่อทุกรูป · บวกคะแนนจิตพิสัย +1</p>
                </div>
              </div>
            )}

            {/* Requester info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ชื่อเจ้าภาพ / ชื่องาน</Label>
                <Input placeholder="ระบุชื่อเจ้าภาพหรือชื่องาน" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์</Label>
                <Input
                  placeholder="0xxxxxxxxx"
                  value={phoneNumber}
                  onChange={handlePhoneInput}
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]*"
                />
              </div>
            </div>

            {/* Ceremony Title */}
            <div className="space-y-2">
              <Label>ชื่องานพิธี (ไม่โชว์ให้พระเห็น)</Label>
              <Input placeholder="เช่น ทำบุญขึ้นบ้านใหม่, สวดอภิธรรม" value={ceremonyTitle} onChange={(e) => setCeremonyTitle(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">🔒 ชื่องานจะไม่แสดงในหน้าคำเชิญของพระ เพื่อลดอคติ</p>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>สถานที่จัด</Label>
                <Select value={ceremonyLocation} onValueChange={(v) => setCeremonyLocation(v as CeremonyLocation)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ในวัด">🏛️ ภายในวัด</SelectItem>
                    <SelectItem value="นอกวัด">🏠 นอกสถานที่</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>เวลา</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            {/* Date & Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>วันที่</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP', { locale: th }) : 'เลือกวันที่'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>รายละเอียด</Label>
                <Input placeholder="บ้าน, สถานที่, หมายเหตุ" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {/* Location + Maps */}
            {ceremonyLocation === 'นอกวัด' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Search className="h-4 w-4 text-primary" /> ค้นหาสถานที่ (จำลอง Google Maps)</Label>
                  <Input placeholder="พิมพ์ค้นหาสถานที่..." value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ลิงก์ Google Maps</Label>
                  <Input placeholder="https://maps.google.com/..." value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} />
                </div>
                {location && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <div className="rounded-lg bg-muted h-32 flex items-center justify-center border">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-1" />
                        <p className="text-xs font-medium">📍 {location}</p>
                      </div>
                    </div>
                    <p className="text-xs text-primary font-medium">🚗 {estimatedDistance}</p>
                  </div>
                )}
              </div>
            )}

            {/* Temple preparation (ผาติกรรม) — only if ในวัด */}
            {ceremonyLocation === 'ในวัด' && (
              <div className="space-y-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <Label className="font-semibold text-sm">เครื่องไทยธรรม (ผาติกรรม)</Label>
                </div>
                <RadioGroup value={templePreparationMode} onValueChange={(v) => {
                  setTemplePreparationMode(v as TemplePreparationMode);
                  setNeedTemplePreparation(v === 'ทำผาติกรรม');
                }} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="เจ้าภาพเตรียมเอง" id="adm-prep-self" />
                    <Label htmlFor="adm-prep-self" className="cursor-pointer font-normal text-sm">🔘 เจ้าภาพเตรียมเครื่องไทยธรรมมาเอง</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="ทำผาติกรรม" id="adm-prep-temple" />
                    <Label htmlFor="adm-prep-temple" className="cursor-pointer font-normal text-sm">🔘 ให้ทางวัดจัดเตรียมไว้ให้ (ทำผาติกรรม)</Label>
                  </div>
                </RadioGroup>
                {templePreparationMode === 'ทำผาติกรรม' && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          💡 การทำผาติกรรม: คือการขอให้วัดอำนวยความสะดวกจัดเตรียมสิ่งของให้ล่วงหน้า
                          โดยเจ้าภาพต้องชำระปัจจัยเพื่อชดเชยสิ่งของสงฆ์
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 pl-2">
                      {['เครื่องสังฆทาน', 'ดอกไม้ ธูป เทียน', 'ผ้าไตรจีวร'].map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <Checkbox
                            id={`adm-prep-${item}`}
                            checked={templePreparationItems.has(item)}
                            onCheckedChange={() => togglePrepItem(item)}
                          />
                          <Label htmlFor={`adm-prep-${item}`} className="cursor-pointer text-sm">{item}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ภัตตาหาร */}
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🍱</span>
                <Label className="font-semibold text-sm">ภัตตาหาร</Label>
              </div>
              <RadioGroup value={mealOption} onValueChange={(v) => setMealOption(v as any)} className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ไม่มี" id="adm-meal-none" />
                  <Label htmlFor="adm-meal-none" className="cursor-pointer font-normal text-sm">ไม่มี</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ภัตตาหาร" id="adm-meal-food" />
                  <Label htmlFor="adm-meal-food" className="cursor-pointer font-normal text-sm">🍱 ถวายภัตตาหาร</Label>
                </div>
              </RadioGroup>
              {mealOption !== 'ไม่มี' && (
                <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                  <RadioGroup value={diningStyle} onValueChange={setDiningStyle} className="flex flex-col gap-2">
                    {ceremonyLocation === 'ในวัด' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="เฉพาะรูป" id="adm-d-ind" />
                          <Label htmlFor="adm-d-ind" className="cursor-pointer font-normal text-sm">🔵 เฉพาะรูป</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="ฉันวง" id="adm-d-circle" />
                          <Label htmlFor="adm-d-circle" className="cursor-pointer font-normal text-sm">🟡 วงฉัน (เวลา 10.45-11.00น.)</Label>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="ฉันวง" id="adm-d-circle-out" />
                          <Label htmlFor="adm-d-circle-out" className="cursor-pointer font-normal text-sm">🟡 ฉันวง</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="อื่นๆ" id="adm-d-other" />
                          <Label htmlFor="adm-d-other" className="cursor-pointer font-normal text-sm">📝 อื่นๆ</Label>
                        </div>
                      </>
                    )}
                  </RadioGroup>
                  {diningStyle === 'อื่นๆ' && (
                    <Textarea placeholder="อธิบายรูปแบบ..." value={diningOtherDetails} onChange={(e) => setDiningOtherDetails(e.target.value)} rows={2} />
                  )}
                </div>
              )}
            </div>

            {/* นิมนต์อุ้มบาตร */}
            <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox id="adm-alms-bowl" checked={hasAlmsBowlCeremony} onCheckedChange={(checked) => setHasAlmsBowlCeremony(!!checked)} />
                <Label htmlFor="adm-alms-bowl" className="cursor-pointer flex items-center gap-2 text-sm font-semibold">
                  🪷 มีพิธีตักบาตร (นิมนต์พระนำบาตรติดตัวไปด้วย)
                </Label>
              </div>
            </div>

            {/* Preparation Guide Accordion */}
            {(ceremonyType === 'มงคล' || ceremonyType === 'อวมงคล') && (
              <Accordion type="single" collapsible>
                <AccordionItem value="guide" className="border rounded-lg">
                  <AccordionTrigger className="px-4 text-sm">
                    📋 คำแนะนำและสิ่งที่ต้องเตรียม ({ceremonyType === 'มงคล' ? 'งานมงคล' : 'งานอวมงคล'})
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">⏰ เรื่องเวลา:</p>
                      <Textarea placeholder={SUGGESTED_TIME[ceremonyType] || ''} value={suggestedTime} onChange={(e) => setSuggestedTime(e.target.value)} rows={2} className="text-xs" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">📦 สิ่งที่ต้องเตรียม:</p>
                      <Textarea placeholder={SUGGESTED_ITEMS[ceremonyType] || ''} value={suggestedItems} onChange={(e) => setSuggestedItems(e.target.value)} rows={3} className="text-xs" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {!isOpenForAll && (
              <>
                {/* Chanting selection */}
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => setShowChants(!showChants)} className="gap-1">
                    📿 เลือกบทสวด ({selectedChantIds.size} บท)
                  </Button>
                  {showChants && (
                    <Card className="border-gold-subtle">
                      <CardContent className="pt-4 space-y-3 max-h-[400px] overflow-y-auto">
                        {CHANT_CATEGORIES
                          .filter(cat => cat.type === 'ให้พร' || cat.type === ceremonyType)
                          .map(cat => (
                            <div key={cat.id} className="space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">{cat.name}</p>
                              <div className="grid grid-cols-2 gap-1 pl-2">
                                {cat.chants.map(ch => (
                                  <div key={ch.id} className="flex items-center gap-2">
                                    <Checkbox id={`adm-${ch.id}`} checked={selectedChantIds.has(ch.id)} onCheckedChange={() => toggleChant(ch.id)} />
                                    <Label htmlFor={`adm-${ch.id}`} className="text-xs cursor-pointer">{ch.name}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Specify monks */}
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => setShowMonkSelect(!showMonkSelect)} className="gap-1">
                    👤 เจาะจงพระ ({specifiedMonkIds.size} รูป)
                  </Button>
                  {showMonkSelect && (
                    <Card className="border-gold-subtle">
                      <CardContent className="pt-4 max-h-[300px] overflow-y-auto space-y-1">
                        {monks.map(m => (
                          <div key={m.id} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50">
                            <Checkbox
                              id={`monk-${m.id}`}
                              checked={specifiedMonkIds.has(m.id)}
                              onCheckedChange={(checked) => {
                                setSpecifiedMonkIds(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(m.id); else next.delete(m.id);
                                  return next;
                                });
                              }}
                            />
                            <Label htmlFor={`monk-${m.id}`} className="text-xs cursor-pointer">
                              {m.name} ({m.rank} · คะแนน: {m.activityScore || 0})
                            </Label>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Quota preview */}
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium text-muted-foreground mb-2">โควตาสำหรับ {monkCount} รูป:</p>
                  <div className="flex flex-wrap gap-2">
                    {QUOTA_CONFIGS[monkCount] && (
                      <>
                        <Badge variant="gold">หัวนำสวด {QUOTA_CONFIGS[monkCount].lead}</Badge>
                        <Badge variant="maha">มหาเถระ {QUOTA_CONFIGS[monkCount].มหาเถระ}</Badge>
                        <Badge variant="thera">เถระ {QUOTA_CONFIGS[monkCount].เถระ}</Badge>
                        <Badge variant="majjhima">มัชฌิมะ {QUOTA_CONFIGS[monkCount].มัชฌิมะ}</Badge>
                        <Badge variant="navaka">นวกะ {QUOTA_CONFIGS[monkCount].นวกะ}</Badge>
                      </>
                    )}
                  </div>
                </div>

                <Button variant="gold" className="w-full gap-2" size="lg" onClick={handleGenerate}>
                  <Sparkles className="h-5 w-5" />
                  🤖 จัดรายชื่อตามคิว
                </Button>
              </>
            )}

            {isOpenForAll && (
              <Button variant="gold" className="w-full gap-2" size="lg" onClick={handleConfirmDraft}>
                <Globe className="h-5 w-5" />
                สร้างงานส่วนรวม (เช็กชื่อทั้งวัด)
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Draft Results */}
        {draftAssignments && !isOpenForAll && (
          <Card className="shadow-card border-gold-subtle animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                รายชื่อแบบร่าง — {ceremonyType} ({monkCount} รูป)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {draftAssignments.map((a, i) => (
                <div key={a.monk.id} className="flex items-center justify-between rounded-lg border bg-background p-3 animate-slide-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-sm">{i + 1}</span>
                    <div>
                      <p className="font-medium">{a.monk.name}</p>
                      <p className="text-xs text-muted-foreground">{a.monk.building} · พรรษา {a.monk.yearsOrdained} · คะแนน: {a.monk.activityScore || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rankBadgeVariant(a.monk.rank)}>{a.monk.rank}</Badge>
                    {a.role === 'หัวนำสวด' && <Badge variant="gold">🎵 หัวนำสวด</Badge>}
                    {specifiedMonkIds.has(a.monk.id) && <Badge variant="outline" className="text-xs">เจาะจง</Badge>}
                  </div>
                </div>
              ))}
              {hasAlmsBowlCeremony && (
                <div className="rounded-lg border-2 border-accent/30 bg-accent/5 p-3 text-center">
                  <Badge variant="warning" className="text-sm">🪷 งานนี้มีพิธีตักบาตร — พระต้องนำบาตรติดตัวไปด้วย</Badge>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="gold" className="flex-1" onClick={handleConfirmDraft}>
                  💾 ยืนยันและส่งให้พระ/สามเณรกดรับงาน
                </Button>
                <Button variant="outline" onClick={() => setDraftAssignments(null)}>ยกเลิก</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Ceremonies */}
        {ceremonies.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">📋 งานทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ceremonies.slice(0, 10).map(c => (
                <div key={c.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {c.isOpenForAll && <Globe className="h-4 w-4 text-primary" />}
                        {c.ceremonyTitle || c.description || c.type} — {c.isOpenForAll ? 'ทั้งวัด' : `${c.monkCount} รูป`}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.requesterName} · {c.date}</p>
                      {c.hasAlmsBowlCeremony && <Badge variant="warning" className="text-[10px] mt-1">🪷 ตักบาตร</Badge>}
                    </div>
                    <Badge variant={
                      c.status === 'completed' ? 'default' :
                      c.status === 'confirmed' ? 'success' :
                      c.status === 'pending' ? 'warning' : 'outline'
                    }>
                      {c.status === 'completed' ? '✅ จบงาน' :
                       c.status === 'confirmed' ? 'ยืนยันแล้ว' :
                       c.status === 'pending' ? 'รอตอบรับ' : 'ร่าง'}
                    </Badge>
                  </div>
                  {c.status !== 'completed' && (
                    <div className="flex gap-2">
                      {c.isOpenForAll && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setManagingCeremony(c)}>
                          <UserCheck className="h-4 w-4" /> เช็กชื่อ
                        </Button>
                      )}
                      <Button variant="gold" size="sm" className="gap-1" onClick={() => handleCompleteCeremony(c)}>
                        <CheckCircle className="h-4 w-4" /> จบงาน & บันทึกประวัติ
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Monk List with History */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              รายชื่อพระ — ดูประวัติการรับงาน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {monks.map(m => {
                const history = m.assignmentHistory || [];
                const attended = history.filter(h => h.status === 'attended').length;
                const rejected = history.filter(h => h.status !== 'attended').length;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setHistoryMonk(m)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={rankBadgeVariant(m.rank)} className="text-[10px] shrink-0">{m.rank}</Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{m.building} · คะแนนจิตพิสัย: {m.activityScore || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {history.length > 0 ? (
                        <>
                          <span className="text-xs text-success font-medium">✅ {attended}</span>
                          <span className="text-xs text-destructive font-medium">❌ {rejected}</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">ยังไม่มีประวัติ</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Monk History Dialog */}
      <Dialog open={!!historyMonk} onOpenChange={() => setHistoryMonk(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              ประวัติการรับงาน — {historyMonk?.name}
            </DialogTitle>
          </DialogHeader>
          {historyMonk && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={rankBadgeVariant(historyMonk.rank)}>{historyMonk.rank}</Badge>
                <Badge variant="outline">พรรษา {historyMonk.yearsOrdained}</Badge>
                <Badge variant="outline">{historyMonk.building}</Badge>
                <Badge variant="outline">คะแนนจิตพิสัย: {historyMonk.activityScore || 0}</Badge>
              </div>
              {(historyMonk.assignmentHistory || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีประวัติการรับงาน</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">วันที่</TableHead>
                      <TableHead className="text-xs">ชื่องาน</TableHead>
                      <TableHead className="text-xs">หน้าที่</TableHead>
                      <TableHead className="text-xs text-center">สถานะ</TableHead>
                      <TableHead className="text-xs">เหตุผล</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(historyMonk.assignmentHistory || []).map((h, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{h.date}</TableCell>
                        <TableCell className="text-xs">{h.ceremonyName}</TableCell>
                        <TableCell className="text-xs">{h.role || '-'}</TableCell>
                        <TableCell className="text-center">
                          {h.status === 'attended' ? (
                            <Badge variant="success" className="text-[10px]">✅ ไปงาน</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">❌ ปฏิเสธ</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{h.rejectReason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Check-in Dialog */}
      <Dialog open={!!managingCeremony} onOpenChange={() => setManagingCeremony(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              เช็กชื่องานส่วนรวม — {managingCeremony?.ceremonyTitle || managingCeremony?.description || managingCeremony?.type}
            </DialogTitle>
          </DialogHeader>
          {managingCeremony && managingCeremony.checkInResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">เข้าร่วม: <strong className="text-success">{managingCeremony.checkInResults.filter(cr => cr.attended).length}</strong> / {managingCeremony.checkInResults.length} รูป</span>
                <Button variant="outline" size="sm" onClick={() => {
                  const allChecked = managingCeremony.checkInResults!.every(cr => cr.attended);
                  const updatedCeremonies = ceremonies.map(c => {
                    if (c.id !== managingCeremony.id) return c;
                    return { ...c, checkInResults: c.checkInResults!.map(cr => ({ ...cr, attended: !allChecked })) };
                  });
                  setCeremonies(updatedCeremonies);
                  saveCeremonies(updatedCeremonies);
                  setManagingCeremony(updatedCeremonies.find(c => c.id === managingCeremony.id) || null);
                }}>
                  {managingCeremony.checkInResults.every(cr => cr.attended) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </Button>
              </div>
              <div className="space-y-1">
                {managingCeremony.checkInResults.map(cr => {
                  const monk = monks.find(m => m.id === cr.monkId);
                  if (!monk) return null;
                  return (
                    <div
                      key={cr.monkId}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all select-none active:scale-[0.98]",
                        cr.attended ? "bg-success/10 border-success/30" : "bg-background hover:bg-muted/50"
                      )}
                      onClick={() => toggleCheckIn(managingCeremony.id, cr.monkId)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={rankBadgeVariant(monk.rank)} className="text-[10px]">{monk.rank}</Badge>
                        <div>
                          <p className="text-sm font-medium">{monk.name}</p>
                          <p className="text-[10px] text-muted-foreground">{monk.building}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all",
                        cr.attended ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {cr.attended ? '✅' : '❌'}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button variant="gold" className="w-full gap-2" size="lg" onClick={() => handleCompleteCeremony(managingCeremony)}>
                <CheckCircle className="h-5 w-5" />
                บันทึกจบงานส่วนรวม (+1 คะแนนจิตพิสัยผู้เข้าร่วม)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog open={!!viewingRequest} onOpenChange={() => setViewingRequest(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              รายละเอียดคำขอนิมนต์
            </DialogTitle>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">เจ้าภาพ:</span> <strong>{viewingRequest.requesterName}</strong></div>
                <div><span className="text-muted-foreground">เบอร์:</span> <strong>{viewingRequest.phoneNumber}</strong></div>
                <div><span className="text-muted-foreground">ประเภท:</span> <strong>{viewingRequest.ceremonyType}</strong></div>
                <div><span className="text-muted-foreground">จำนวน:</span> <strong>{viewingRequest.monkCount} รูป</strong></div>
                <div><span className="text-muted-foreground">วันที่:</span> <strong>{viewingRequest.date}</strong></div>
                <div><span className="text-muted-foreground">เวลา:</span> <strong>{viewingRequest.time}</strong></div>
                <div className="col-span-2"><span className="text-muted-foreground">สถานที่:</span> <strong>{viewingRequest.location} ({viewingRequest.ceremonyLocation})</strong></div>
              </div>
              {viewingRequest.ceremonyTitle && (
                <div><span className="text-muted-foreground">ชื่องาน:</span> <strong>{viewingRequest.ceremonyTitle}</strong></div>
              )}
              {viewingRequest.specifiedMonkNames && (
                <div className="rounded-lg bg-primary/5 p-3 border border-primary/20">
                  <span className="text-muted-foreground">👤 พระที่เจาะจง:</span> <strong className="text-primary">{viewingRequest.specifiedMonkNames}</strong>
                </div>
              )}
              {viewingRequest.hasAlmsBowlCeremony && (
                <Badge variant="warning" className="text-sm">🪷 มีพิธีตักบาตร</Badge>
              )}
              {viewingRequest.mealOption && viewingRequest.mealOption !== 'ไม่มี' && (
                <div><span className="text-muted-foreground">🍱 ภัตตาหาร:</span> <strong>{viewingRequest.diningStyle}</strong></div>
              )}
              {viewingRequest.needTemplePreparation && viewingRequest.templePreparationItems && (
                <div><span className="text-muted-foreground">📦 ผาติกรรม:</span> <strong>{viewingRequest.templePreparationItems.join(', ')}</strong></div>
              )}
              {viewingRequest.additionalDetails && (
                <div><span className="text-muted-foreground">หมายเหตุ:</span> {viewingRequest.additionalDetails}</div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="gold" className="flex-1 gap-1" onClick={() => handleApproveRequest(viewingRequest)}>
                  <CheckCircle className="h-4 w-4" /> รับคำขอ & สร้างงาน
                </Button>
                <Button variant="destructive" className="gap-1" onClick={() => handleRejectRequest(viewingRequest.id)}>
                  <XCircle className="h-4 w-4" /> ปฏิเสธ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
