import { useState, useEffect } from 'react';
import { Ceremony } from '@/lib/types';
import { loadCeremonies } from '@/lib/storage';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle, XCircle, RefreshCw, Clock, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const rankBadgeVariant = (rank: string) => {
  switch (rank) {
    case 'มหาเถระ': return 'maha' as const;
    case 'เถระ': return 'thera' as const;
    case 'มัชฌิมะ': return 'majjhima' as const;
    case 'นวกะ': return 'navaka' as const;
    default: return 'default' as const;
  }
};

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'outline' | 'default'; icon: typeof CheckCircle }> = {
  completed: { label: '✅ จบงาน', variant: 'default', icon: CheckCircle },
  confirmed: { label: 'ยืนยันแล้ว', variant: 'success', icon: CheckCircle },
  pending: { label: 'รออนุมัติ', variant: 'warning', icon: Clock },
  draft: { label: 'ร่าง', variant: 'outline', icon: Clock },
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    setCeremonies(loadCeremonies());
  }, []);

  const filtered = ceremonies
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .filter(c => filterType === 'all' || c.type === filterType)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    total: ceremonies.length,
    confirmed: ceremonies.filter(c => c.status === 'confirmed').length,
    completed: ceremonies.filter(c => c.status === 'completed').length,
    pending: ceremonies.filter(c => c.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-maroon px-4 py-6 shadow-lg">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <span className="text-xl">📜</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">ประวัติงานย้อนหลัง</h1>
              <p className="text-sm text-primary-foreground/70">ตรวจสอบรายละเอียดงานที่ผ่านมา</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-4">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
        </Button>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="shadow-card text-center">
            <CardContent className="py-3">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">งานทั้งหมด</p>
            </CardContent>
          </Card>
          <Card className="shadow-card text-center">
            <CardContent className="py-3">
              <p className="text-2xl font-bold text-success">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">จบงานแล้ว</p>
            </CardContent>
          </Card>
          <Card className="shadow-card text-center">
            <CardContent className="py-3">
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">รออนุมัติ</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="completed">จบงานแล้ว</SelectItem>
              <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
              <SelectItem value="pending">รออนุมัติ</SelectItem>
              <SelectItem value="draft">ร่าง</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="ประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              <SelectItem value="มงคล">🟢 มงคล</SelectItem>
              <SelectItem value="อวมงคล">🔴 อวมงคล</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground self-center ml-auto">
            {filtered.length} รายการ
          </p>
        </div>

        {/* Ceremony List */}
        {filtered.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-lg">ยังไม่มีประวัติงาน</p>
              <p className="text-sm mt-1">สร้างงานจากหน้าแอดมินก่อน</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((c, idx) => {
              const isExpanded = expandedId === c.id;
              const cfg = statusConfig[c.status] || statusConfig.draft;
              const StatusIcon = cfg.icon;

              return (
                <Card
                  key={c.id}
                  className="shadow-card animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">
                        {c.type === 'มงคล' ? '🟢' : c.type === 'อวมงคล' ? '🔴' : '🟡'}
                      </div>
                      <div>
                        <p className="font-semibold">{c.type} — {c.monkCount} รูป</p>
                        <p className="text-xs text-muted-foreground">
                          {c.requesterName} · {c.date} · {c.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cfg.variant}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <CardContent className="border-t pt-4 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground mb-3">
                        รายชื่อพระ ({c.assignments.length} รูป)
                      </p>
                      {c.assignments.map((a, i) => (
                        <div
                          key={a.monk.id}
                          className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                            a.status === 'approved' ? 'bg-success/5 border-success/30' :
                            a.status === 'rejected' ? 'bg-destructive/5 border-destructive/30' :
                            a.status === 'substituted' ? 'bg-warning/5 border-warning/30' :
                            'bg-background'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-medium">{a.monk.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {a.monk.building} · พรรษา {a.monk.yearsOrdained}
                              </p>
                              {a.rejectReason && (
                                <p className="text-xs text-destructive mt-0.5">เหตุผล: {a.rejectReason}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Badge variant={rankBadgeVariant(a.monk.rank)} className="text-xs">
                              {a.monk.rank}
                            </Badge>
                            {a.role === 'หัวนำสวด' && <Badge variant="gold" className="text-xs">🎵</Badge>}
                            {a.status === 'approved' && (
                              <Badge variant="success" className="text-xs gap-1">
                                <CheckCircle className="h-3 w-3" /> รับงาน
                              </Badge>
                            )}
                            {a.status === 'rejected' && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <XCircle className="h-3 w-3" /> ปฏิเสธ
                              </Badge>
                            )}
                            {a.status === 'substituted' && (
                              <Badge variant="warning" className="text-xs gap-1">
                                <RefreshCw className="h-3 w-3" /> เปลี่ยนตัว
                              </Badge>
                            )}
                            {a.status === 'pending' && (
                              <Badge variant="outline" className="text-xs">รอตอบรับ</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {c.assignments.some(a => a.substitute) && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">ตัวแทน</p>
                          {c.assignments
                            .filter(a => a.substitute)
                            .map(a => (
                              <div key={`sub-${a.monk.id}`} className="flex items-center gap-2 rounded bg-muted p-2 text-sm">
                                <RefreshCw className="h-4 w-4 text-primary" />
                                <span className="text-muted-foreground">{a.monk.name}</span>
                                <span>→</span>
                                <span className="font-medium">{a.substitute!.name}</span>
                                <Badge variant={rankBadgeVariant(a.substitute!.rank)} className="text-xs">
                                  {a.substitute!.rank}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
