// รายการบทสวดทั้งหมด แบ่งตามหมวด (ให้พร, มงคล, อวมงคล)

export interface ChantCategory {
  id: string;
  name: string;
  type: 'ให้พร' | 'มงคล' | 'อวมงคล';
  chants: ChantItem[];
}

export interface ChantItem {
  id: string;
  name: string;
}

export interface LeadChanterCriteria {
  canGiveSila5: boolean;    // ให้ศีล 5 ได้
  canGiveSila8: boolean;    // ให้ศีล 8 ได้
  canPreach: boolean;       // บรรยายธรรมได้
  hasNakdhammEk: boolean;   // จบนักธรรมเอก
}

export const CHANT_CATEGORIES: ChantCategory[] = [
  {
    id: 'blessing',
    name: 'ให้พร',
    type: 'ให้พร',
    chants: [
      { id: 'b1', name: 'ยถา-สัพพี' },
      { id: 'b2', name: 'สัพพะโร' },
      { id: 'b3', name: 'ระตะนัตตะยา' },
      { id: 'b4', name: 'มงคลจักรวาฬน้อย ย่อ' },
      { id: 'b5', name: 'อายุโท' },
      { id: 'b6', name: 'มงคลจักรวาฬใหญ่' },
      { id: 'b7', name: 'อัคคะโต เว' },
      { id: 'b8', name: 'โส อัททะลัทโธ' },
      { id: 'b9', name: 'สักกัตวา' },
      { id: 'b10', name: 'นัตถิ เม' },
      { id: 'b11', name: 'ยังกิญจิ ระตะนัง' },
      { id: 'b12', name: 'ยสฺมึ ปเทเส' },
      { id: 'b13', name: 'ยานีธ ภูตานิ' },
      { id: 'b14', name: 'ภุตตา โภคา' },
    ],
  },
  {
    id: 'mangkol-devata',
    name: 'ชุมนุมเทวดา',
    type: 'มงคล',
    chants: [
      { id: 'm0', name: 'ชุมนุมเทวดา' },
    ],
  },
  {
    id: 'mangkol-parit',
    name: 'พระปริตร',
    type: 'มงคล',
    chants: [
      { id: 'm1', name: 'สัมพุทเธ' },
      { id: 'm2', name: 'นะโม 8' },
      { id: 'm3', name: 'มงคลสูตร' },
      { id: 'm4', name: 'รัตนสูตร' },
      { id: 'm5', name: 'กรณียเมตตสูตร' },
      { id: 'm6', name: 'ขันธปริตร' },
      { id: 'm7', name: 'โมรปริตร' },
      { id: 'm8', name: 'วิปัสสิสสะ' },
      { id: 'm9', name: 'อังคุลิมาลปริตร' },
      { id: 'm10', name: 'โพชฌังคะปริตร' },
      { id: 'm11', name: 'วัฏฏะกะปริตร' },
      { id: 'm12', name: 'ยันทุนนิมิตตัง' },
      { id: 'm13', name: 'เทวตาอุยโยชนคาถา' },
      { id: 'm14', name: 'โย จักขุมา' },
    ],
  },
  {
    id: 'mangkol-buddhamon',
    name: 'เจริญพระพุทธมนต์',
    type: 'มงคล',
    chants: [
      { id: 'm15', name: 'อิติปิโส' },
      { id: 'm16', name: 'พาหุง' },
      { id: 'm17', name: 'มหาการุณิโก (ชยันโต)' },
    ],
  },
  {
    id: 'mangkol-dhammachak',
    name: 'ธัมมจักร',
    type: 'มงคล',
    chants: [
      { id: 'm18', name: 'ธัมมจักร' },
    ],
  },
  {
    id: 'avamangkol-abhidhamma',
    name: 'อภิธรรม 7 คัมภีร์',
    type: 'อวมงคล',
    chants: [
      { id: 'a1', name: 'กุสะลา ธัมมา' },
      { id: 'a2', name: 'ปัญจักขันธา' },
      { id: 'a3', name: 'สังคะโห' },
      { id: 'a4', name: 'ฉ ปัญญัตติโย' },
      { id: 'a5', name: 'ปุคคะโล' },
      { id: 'a6', name: 'เย เกจิ' },
      { id: 'a7', name: 'เหตุปัจจะโย' },
      { id: 'a8', name: 'อทาสิ เม อกาสิ เม' },
    ],
  },
  {
    id: 'avamangkol-dhammaniyam',
    name: 'ธรรมนิยาม',
    type: 'อวมงคล',
    chants: [
      { id: 'a9', name: 'ยถาปิ เสลา' },
      { id: 'a10', name: 'ยัสสะ สัทธา' },
      { id: 'a11', name: 'อุปปาทา วา ภิกขะเว' },
      { id: 'a12', name: 'สัพเพ สังขารา อนิจจาติ' },
      { id: 'a13', name: 'อวิชชา ปัจจะยา' },
      { id: 'a14', name: 'ยทา หเว' },
      { id: 'a15', name: 'อตีตัง นานวาคเมยยะ' },
      { id: 'a16', name: 'อเนกชาติ สังสารัง' },
    ],
  },
  {
    id: 'avamangkol-matika',
    name: 'มาติกา',
    type: 'อวมงคล',
    chants: [
      { id: 'a17', name: 'กุสลา ธัมมา (มาติกา)' },
      { id: 'a18', name: 'ปัญจักขันธา (มาติกา)' },
    ],
  },
];

// Get all chant IDs
export function getAllChantIds(): string[] {
  return CHANT_CATEGORIES.flatMap(cat => cat.chants.map(c => c.id));
}

// Get chant name by ID
export function getChantNameById(id: string): string {
  for (const cat of CHANT_CATEGORIES) {
    const chant = cat.chants.find(c => c.id === id);
    if (chant) return chant.name;
  }
  return id;
}
