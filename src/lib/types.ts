import { LeadChanterCriteria } from './chantingData';

export type MonkRank = 'มหาเถระ' | 'เถระ' | 'มัชฌิมะ' | 'นวกะ';

export type CeremonyType = 'มงคล' | 'อวมงคล' | 'ใส่บาตรและเจริญพระพุทธมนต์' | 'งานส่วนรวมของวัด';

export type MonkAbility = 'มงคล' | 'อวมงคล' | 'ทั้งสอง';

export type AssignmentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'substituted';

export type CeremonyLocation = 'ในวัด' | 'นอกวัด';

export type MonkAvailability = 'พร้อมรับงาน' | 'ไม่พร้อมรับงาน';
export type MonkAcceptMode = 'รับงานทั่วไป' | 'รับเฉพาะงานเจาะจง';

export interface AssignmentHistoryEntry {
  ceremonyId: string;
  ceremonyName: string;
  date: string;
  status: 'attended' | 'rejected' | 'substituted';
  role?: 'หัวนำสวด' | 'ผู้สวด';
  rejectReason?: string;
}

export interface Monk {
  id: string;
  name: string;
  rank: MonkRank;
  yearsOrdained: number;
  building: string;
  ability: MonkAbility;
  canLead: boolean;
  queueScore: number;
  isFrozen: boolean;
  totalAssignments: number;
  chantIds?: string[];
  activityScore: number;
  leadCriteria?: LeadChanterCriteria;
  assignmentHistory?: AssignmentHistoryEntry[];
  availability: MonkAvailability;
  unavailableReason?: string;
  acceptMode: MonkAcceptMode;
}

export interface QuotaConfig {
  total: number;
  lead: number;
  มหาเถระ: number;
  เถระ: number;
  มัชฌิมะ: number;
  นวกะ: number;
}

export interface Assignment {
  monk: Monk;
  role: 'หัวนำสวด' | 'ผู้สวด';
  status: AssignmentStatus;
  rejectReason?: string;
  substitute?: Monk;
  sermonTopic?: string;
}

export type TransportOption = 'เจ้าภาพรับ-ส่ง' | 'วัดเดินทางเอง';
export type MealOption = 'ไม่มี' | 'ภัตตาหาร';
export type DiningStyle = 'ฉันวง' | 'ฉันโตก' | 'เฉพาะรูป' | 'อื่นๆ';
export type TemplePreparationMode = 'เจ้าภาพเตรียมเอง' | 'ทำผาติกรรม';

export interface CeremonyRequest {
  id: string;
  requesterName: string;
  phoneNumber: string;
  lineId?: string;
  ceremonyType: CeremonyType;
  ceremonyTitle?: string;
  date: string;
  time: string;
  monkCount: number;
  specifiedMonkNames?: string;
  ceremonyLocation: CeremonyLocation;
  location: string;
  locationUrl?: string;
  transportOption: TransportOption;
  pickupTime?: string;
  mealOption: MealOption;
  diningStyle?: DiningStyle;
  diningOtherDetails?: string;
  additionalDetails?: string;
  description: string;
  needTemplePreparation: boolean;
  templePreparationMode?: TemplePreparationMode;
  templePreparationDetails?: string;
  templePreparationItems?: string[];
  selectedChantIds?: string[];
  specifiedMonkIds?: string[];
  hasAlmsBowlCeremony?: boolean;
  status: 'waiting' | 'approved' | 'rejected';
  createdAt: string;
  suggestedItems?: string;
  suggestedTime?: string;
}

export interface CheckInEntry {
  monkId: string;
  attended: boolean;
}

export interface Ceremony {
  id: string;
  date: string;
  time?: string;
  type: CeremonyType;
  monkCount: number;
  requesterName: string;
  description: string;
  assignments: Assignment[];
  status: 'draft' | 'pending' | 'confirmed' | 'completed';
  createdAt: string;
  location?: string;
  locationUrl?: string;
  ceremonyLocation?: CeremonyLocation;
  selectedChantIds?: string[];
  suggestedItems?: string;
  suggestedTime?: string;
  needTemplePreparation?: boolean;
  templePreparationMode?: TemplePreparationMode;
  templePreparationDetails?: string;
  templePreparationItems?: string[];
  requestId?: string;
  isOpenForAll?: boolean;
  checkInResults?: CheckInEntry[];
  phoneNumber?: string;
  hasAlmsBowlCeremony?: boolean;
  mealOption?: MealOption;
  diningStyle?: DiningStyle;
  diningOtherDetails?: string;
  ceremonyTitle?: string;
}

// Quota configs for different ceremony sizes
export const QUOTA_CONFIGS: Record<number, QuotaConfig> = {
  3: { total: 3, lead: 1, มหาเถระ: 1, เถระ: 1, มัชฌิมะ: 1, นวกะ: 0 },
  4: { total: 4, lead: 1, มหาเถระ: 1, เถระ: 1, มัชฌิมะ: 1, นวกะ: 1 },
  5: { total: 5, lead: 1, มหาเถระ: 2, เถระ: 1, มัชฌิมะ: 1, นวกะ: 1 },
  7: { total: 7, lead: 1, มหาเถระ: 2, เถระ: 2, มัชฌิมะ: 2, นวกะ: 1 },
  9: { total: 9, lead: 1, มหาเถระ: 3, เถระ: 2, มัชฌิมะ: 2, นวกะ: 2 },
  10: { total: 10, lead: 1, มหาเถระ: 3, เถระ: 3, มัชฌิมะ: 2, นวกะ: 2 },
};

export const RANK_ORDER: MonkRank[] = ['มหาเถระ', 'เถระ', 'มัชฌิมะ', 'นวกะ'];

export const RANK_COLORS: Record<MonkRank, string> = {
  'มหาเถระ': 'bg-primary text-primary-foreground',
  'เถระ': 'bg-secondary text-secondary-foreground',
  'มัชฌิมะ': 'bg-gold-dark text-cream',
  'นวกะ': 'bg-muted text-foreground',
};

export const REJECTION_REASONS = [
  'อาพาธ',
  'ติดสอบบาลี',
  'ติดสอบนักธรรม',
  'ติดธุระส่วนตัว',
  'เดินทางไม่ได้',
  'สละสิทธิ์',
  'อื่นๆ',
];
