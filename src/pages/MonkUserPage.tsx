import { useState, useEffect } from 'react';
import { Monk } from '@/lib/types';
import { CHANT_CATEGORIES, LeadChanterCriteria } from '@/lib/chantingData';
import { loadMonks, saveMonks } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Star, Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MonkUserPage() {
  const navigate = useNavigate();
  const [monks, setMonks] = useState<Monk[]>([]);
  const [selectedMonkId, setSelectedMonkId] = useState<string>('');
  const [selectedChants, setSelectedChants] = useState<Set<string>>(new Set());
  const [leadCriteria, setLeadCriteria] = useState<LeadChanterCriteria>({
    canGiveSila5: false,
    canGiveSila8: false,
    canPreach: false,
    hasNakdhammEk: false,
  });

  useEffect(() => {
    setMonks(loadMonks());
  }, []);

  const selectedMonk = monks.find(m => m.id === selectedMonkId);

  useEffect(() => {
    if (selectedMonk) {
      setSelectedChants(new Set(selectedMonk.chantIds || []));
      setLeadCriteria(selectedMonk.leadCriteria || {
        canGiveSila5: false,
        canGiveSila8: false,
        canPreach: false,
        hasNakdhammEk: false,
      });
    }
  }, [selectedMonkId]);

  const toggleChant = (chantId: string) => {
    setSelectedChants(prev => {
      const next = new Set(prev);
      if (next.has(chantId)) next.delete(chantId);
      else next.add(chantId);
      return next;
    });
  };

  const toggleAllInCategory = (catId: string, checked: boolean) => {
    const cat = CHANT_CATEGORIES.find(c => c.id === catId);
    if (!cat) return;
    setSelectedChants(prev => {
      const next = new Set(prev);
      cat.chants.forEach(ch => {
        if (checked) next.add(ch.id);
        else next.delete(ch.id);
      });
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedMonkId) return;
    const updatedMonks = monks.map(m => {
      if (m.id !== selectedMonkId) return m;
      return {
        ...m,
        chantIds: Array.from(selectedChants),
        leadCriteria,
        canLead: leadCriteria.canGiveSila5 && leadCriteria.canGiveSila8 && leadCriteria.canPreach && leadCriteria.hasNakdhammEk,
      };
    });
    setMonks(updatedMonks);
    saveMonks(updatedMonks);
    toast.success('บันทึกข้อมูลเรียบร้อย');
  };

  const typeColors = {
    'ให้พร': 'text-accent',
    'มงคล': 'text-success',
    'อวมงคล': 'text-muted-foreground',
  };

  const typeEmojis = {
    'ให้พร': '🙏',
    'มงคล': '🟢',
    'อวมงคล': '🔴',
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-maroon px-4 py-6 shadow-lg">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <span className="text-xl">📿</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-cream">หน้าพระ/เณร</h1>
              <p className="text-sm text-cream/70">เลือกบทสวดที่สวดได้ และเกณฑ์หัวนำสวด</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
        </Button>

        {/* Select Monk */}
        <Card className="shadow-card border-gold-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              เลือกชื่อของท่าน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMonkId} onValueChange={setSelectedMonkId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกชื่อพระ/เณร" />
              </SelectTrigger>
              <SelectContent>
                {monks.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.rank} · {m.building})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedMonk && (
          <>
            {/* Lead Chanter Criteria */}
            <Card className="shadow-card border-gold-subtle animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-accent" />
                  เกณฑ์สำหรับหัวนำสวด
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'canGiveSila5' as const, label: 'ให้ศีล 5 ได้' },
                  { key: 'canGiveSila8' as const, label: 'ให้ศีล 8 ได้' },
                  { key: 'canPreach' as const, label: 'บรรยายธรรมได้' },
                  { key: 'hasNakdhammEk' as const, label: 'จบนักธรรมเอก' },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id={item.key}
                      checked={leadCriteria[item.key]}
                      onCheckedChange={(checked) =>
                        setLeadCriteria(prev => ({ ...prev, [item.key]: !!checked }))
                      }
                    />
                    <Label htmlFor={item.key} className="cursor-pointer">{item.label}</Label>
                  </div>
                ))}
                {leadCriteria.canGiveSila5 && leadCriteria.canGiveSila8 && leadCriteria.canPreach && leadCriteria.hasNakdhammEk && (
                  <Badge variant="gold" className="gap-1">
                    <CheckCircle className="h-3 w-3" /> ผ่านเกณฑ์หัวนำสวด
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Chanting Selection */}
            <div className="space-y-4">
              {['ให้พร', 'มงคล', 'อวมงคล'].map(type => {
                const cats = CHANT_CATEGORIES.filter(c => c.type === type);
                return (
                  <Card key={type} className="shadow-card animate-fade-in">
                    <CardHeader className="pb-3">
                      <CardTitle className={`text-lg flex items-center gap-2 ${typeColors[type as keyof typeof typeColors]}`}>
                        {typeEmojis[type as keyof typeof typeEmojis]} บทสวด — {type}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {cats.map(cat => {
                        const allChecked = cat.chants.every(ch => selectedChants.has(ch.id));
                        const someChecked = cat.chants.some(ch => selectedChants.has(ch.id));
                        return (
                          <div key={cat.id} className="space-y-2">
                            <div className="flex items-center gap-2 border-b pb-1">
                              <Checkbox
                                checked={allChecked}
                                ref={el => {
                                  if (el) (el as any).indeterminate = someChecked && !allChecked;
                                }}
                                onCheckedChange={(checked) => toggleAllInCategory(cat.id, !!checked)}
                              />
                              <Label className="font-semibold text-sm cursor-pointer">{cat.name}</Label>
                              <Badge variant="outline" className="text-xs ml-auto">
                                {cat.chants.filter(ch => selectedChants.has(ch.id)).length}/{cat.chants.length}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-1 pl-6">
                              {cat.chants.map(ch => (
                                <div key={ch.id} className="flex items-center gap-2 p-1 rounded hover:bg-muted/50">
                                  <Checkbox
                                    id={ch.id}
                                    checked={selectedChants.has(ch.id)}
                                    onCheckedChange={() => toggleChant(ch.id)}
                                  />
                                  <Label htmlFor={ch.id} className="text-sm cursor-pointer">{ch.name}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Save Button */}
            <Button variant="gold" size="lg" className="w-full gap-2" onClick={handleSave}>
              <Save className="h-5 w-5" />
              บันทึกข้อมูล ({selectedChants.size} บทสวด)
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
