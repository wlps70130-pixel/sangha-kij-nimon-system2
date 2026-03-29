import { useState, useEffect } from 'react';
import { Monk, RANK_ORDER, MonkRank } from '@/lib/types';
import { loadMonks } from '@/lib/storage';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Snowflake, Users, Crown, ChevronDown, ChevronUp } from 'lucide-react';

const rankConfig: Record<MonkRank, { badge: 'maha' | 'thera' | 'majjhima' | 'navaka'; icon: string; color: string; bgClass: string }> = {
  'มหาเถระ': { badge: 'maha', icon: '🟤', color: 'border-l-primary', bgClass: 'bg-primary/5' },
  'เถระ': { badge: 'thera', icon: '🟠', color: 'border-l-maroon-light', bgClass: 'bg-maroon-light/5' },
  'มัชฌิมะ': { badge: 'majjhima', icon: '🟡', color: 'border-l-gold-dark', bgClass: 'bg-gold-dark/5' },
  'นวกะ': { badge: 'navaka', icon: '⚪', color: 'border-l-muted-foreground', bgClass: 'bg-muted/30' },
};

export default function QueuePage() {
  const navigate = useNavigate();
  const [monks, setMonks] = useState<Monk[]>([]);
  const [expandedRanks, setExpandedRanks] = useState<Set<string>>(new Set(RANK_ORDER));

  useEffect(() => {
    setMonks(loadMonks());
  }, []);

  const toggleRank = (rank: string) => {
    setExpandedRanks(prev => {
      const next = new Set(prev);
      if (next.has(rank)) next.delete(rank);
      else next.add(rank);
      return next;
    });
  };

  // Sort by ordination years descending (seniority)
  const globalSorted = [...monks].sort((a, b) => b.yearsOrdained - a.yearsOrdained);

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-maroon px-4 py-6 shadow-lg">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-cream">กระดานรายชื่อพระ</h1>
              <p className="text-sm text-cream/70">แสดงสถานะความพร้อม (ไม่แสดงคะแนน)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-4">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
        </Button>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RANK_ORDER.map(rank => {
            const count = monks.filter(m => m.rank === rank).length;
            const frozen = monks.filter(m => m.rank === rank && (m.isFrozen || m.availability === 'ไม่พร้อมรับงาน')).length;
            const cfg = rankConfig[rank];
            return (
              <Card
                key={rank}
                className={`shadow-card cursor-pointer hover:shadow-gold transition-all border-l-4 ${cfg.color}`}
                onClick={() => toggleRank(rank)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={cfg.badge} className="text-xs">{rank}</Badge>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  {frozen > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Snowflake className="h-3 w-3 text-blue-500" /> พักงาน {frozen} รูป
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Queue by Rank — NO scores shown */}
        <div className="space-y-3">
          {RANK_ORDER.map(rank => {
            const cfg = rankConfig[rank];
            const rankMonks = globalSorted.filter(m => m.rank === rank);
            const isExpanded = expandedRanks.has(rank);

            return (
              <Card key={rank} className={`shadow-card overflow-hidden border-l-4 ${cfg.color}`}>
                <button
                  className={`w-full flex items-center justify-between px-4 py-3 ${cfg.bgClass} hover:opacity-80 transition-opacity`}
                  onClick={() => toggleRank(rank)}
                >
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{rank}</span>
                    <span className="text-xs text-muted-foreground">({rankMonks.length} รูป)</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <CardContent className="p-0">
                    {/* Table Header — NO คิว/คะแนน columns */}
                    <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem] sm:grid-cols-[3rem_1fr_5rem_5rem] items-center px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                      <span className="text-center">#</span>
                      <span>ชื่อ</span>
                      <span className="text-center hidden sm:block">พรรษา</span>
                      <span className="text-center">สถานะ</span>
                    </div>

                    {rankMonks.map((m, i) => (
                      <div
                        key={m.id}
                        className={`grid grid-cols-[2.5rem_1fr_4rem_4rem] sm:grid-cols-[3rem_1fr_5rem_5rem] items-center px-4 py-2.5 border-b last:border-b-0 text-sm transition-colors animate-slide-in ${
                          m.isFrozen || m.availability === 'ไม่พร้อมรับงาน'
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : i % 2 === 0
                              ? 'bg-background'
                              : 'bg-muted/10'
                        }`}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <span className="text-center font-mono text-muted-foreground text-xs">{i + 1}</span>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{m.name}</span>
                          {m.isFrozen && <Snowflake className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                        </div>
                        <span className="text-center text-xs text-muted-foreground hidden sm:block">
                          {m.yearsOrdained} พรรษา
                        </span>
                        <div className="flex justify-center">
                          {m.isFrozen || m.availability === 'ไม่พร้อมรับงาน' ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-600">
                              พักงาน
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px] px-1.5 py-0">
                              พร้อม
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Legend */}
        <Card className="shadow-card">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">คำอธิบาย</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Badge variant="success" className="text-[10px] px-1.5 py-0">พร้อม</Badge>
                พร้อมรับกิจนิมนต์
              </span>
              <span className="flex items-center gap-1">
                <Snowflake className="h-3 w-3 text-blue-500" /> พักงาน / ไม่พร้อม
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> เรียงตามอาวุโส (พรรษา)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              🔒 คะแนนจิตพิสัยจะไม่แสดงในหน้านี้ เพื่อความเป็นส่วนตัว
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
