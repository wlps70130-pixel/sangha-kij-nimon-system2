import { Monk, MonkRank, CeremonyType, Assignment, QuotaConfig, QUOTA_CONFIGS, RANK_ORDER } from './types';

/**
 * Smart Queue Rotation Engine
 * - Now uses activityScore (highest first) instead of queueScore (lowest first)
 * - Respects rank quotas per ceremony size
 * - Cross-rank substitution when a rank has insufficient available monks
 * - Filters by ceremony type ability
 * - Specified monks are always included first
 */

function filterByAbility(monks: Monk[], type: CeremonyType): Monk[] {
  // For special ceremony types, treat as มงคล for ability filtering
  const abilityType = (type === 'ใส่บาตรและเจริญพระพุทธมนต์' || type === 'งานส่วนรวมของวัด') ? 'มงคล' : type;
  return monks.filter(m =>
    m.ability === 'ทั้งสอง' || m.ability === abilityType
  );
}

function getAvailable(monks: Monk[]): Monk[] {
  return monks.filter(m => 
    m.availability === 'พร้อมรับงาน' && 
    !m.isFrozen && 
    m.acceptMode === 'รับงานทั่วไป'
  );
}

function getAvailableIncludingSpecified(monks: Monk[]): Monk[] {
  return monks.filter(m => 
    m.availability === 'พร้อมรับงาน' && 
    !m.isFrozen
  );
}

/** Sort by activityScore descending (highest first) */
function sortByActivityScore(monks: Monk[]): Monk[] {
  return [...monks].sort((a, b) => (b.activityScore || 0) - (a.activityScore || 0));
}

function pickFromRank(
  available: Monk[],
  rank: MonkRank,
  count: number,
  alreadyPicked: Set<string>
): Monk[] {
  const candidates = sortByActivityScore(
    available.filter(m => m.rank === rank && !alreadyPicked.has(m.id))
  );
  return candidates.slice(0, count);
}

function crossRankSubstitute(
  available: Monk[],
  needed: number,
  alreadyPicked: Set<string>
): Monk[] {
  const substitutionOrder: MonkRank[] = ['มหาเถระ', 'เถระ', 'มัชฌิมะ', 'นวกะ'];
  const subs: Monk[] = [];
  
  for (const rank of substitutionOrder) {
    if (subs.length >= needed) break;
    const candidates = sortByActivityScore(
      available.filter(m => m.rank === rank && !alreadyPicked.has(m.id))
    );
    for (const c of candidates) {
      if (subs.length >= needed) break;
      subs.push(c);
    }
  }
  
  return subs.slice(0, needed);
}

export function generateAssignments(
  allMonks: Monk[],
  ceremonyType: CeremonyType,
  monkCount: number,
  specifiedMonkIds?: Set<string>
): Assignment[] {
  const quota = QUOTA_CONFIGS[monkCount];
  if (!quota) throw new Error(`ไม่รองรับจำนวนพระ ${monkCount} รูป`);

  const picked = new Set<string>();
  const assignments: Assignment[] = [];

  // 0. Add specified monks first (always included regardless of acceptMode)
  if (specifiedMonkIds && specifiedMonkIds.size > 0) {
    const specifiedMonks = allMonks.filter(m => 
      specifiedMonkIds.has(m.id) && 
      m.availability === 'พร้อมรับงาน' && 
      !m.isFrozen
    );
    for (const monk of specifiedMonks) {
      if (assignments.length >= monkCount) break;
      picked.add(monk.id);
      assignments.push({
        monk,
        role: 'ผู้สวด',
        status: 'draft',
      });
    }
  }

  const eligible = getAvailable(filterByAbility(allMonks, ceremonyType));

  // 1. Pick lead chanter (หัวนำสวด) if not already picked
  const hasLead = assignments.some(a => a.monk.canLead);
  if (!hasLead) {
    const leadCandidates = sortByActivityScore(
      eligible.filter(m => m.canLead && !picked.has(m.id))
    );
    if (leadCandidates.length > 0) {
      const lead = leadCandidates[0];
      picked.add(lead.id);
      assignments.push({
        monk: lead,
        role: 'หัวนำสวด',
        status: 'draft',
      });
    }
  } else {
    // Mark the first canLead specified monk as หัวนำสวด
    const leadIdx = assignments.findIndex(a => a.monk.canLead);
    if (leadIdx >= 0) assignments[leadIdx].role = 'หัวนำสวด';
  }

  // 2. Fill quota per rank
  for (const rank of RANK_ORDER) {
    const alreadyFromRank = assignments.filter(a => a.monk.rank === rank).length;
    const needed = Math.max(0, quota[rank] - alreadyFromRank);
    
    const selected = pickFromRank(eligible, rank, needed, picked);
    const deficit = needed - selected.length;

    for (const monk of selected) {
      picked.add(monk.id);
      assignments.push({
        monk,
        role: 'ผู้สวด',
        status: 'draft',
      });
    }

    if (deficit > 0) {
      const subs = crossRankSubstitute(eligible, deficit, picked);
      for (const monk of subs) {
        picked.add(monk.id);
        assignments.push({
          monk,
          role: 'ผู้สวด',
          status: 'draft',
        });
      }
    }
  }

  return assignments.slice(0, monkCount);
}

/**
 * Find substitute: highest activityScore among available monks
 */
export function findSubstitute(
  allMonks: Monk[],
  ceremonyType: CeremonyType,
  excludeIds: Set<string>,
  preferredRank?: MonkRank
): Monk | null {
  const eligible = getAvailable(filterByAbility(allMonks, ceremonyType))
    .filter(m => !excludeIds.has(m.id));
  
  if (preferredRank) {
    const ranked = sortByActivityScore(eligible.filter(m => m.rank === preferredRank));
    if (ranked.length > 0) return ranked[0];
  }
  
  const sorted = sortByActivityScore(eligible);
  return sorted.length > 0 ? sorted[0] : null;
}

/**
 * Process approval/rejection and update queue scores
 */
export function processApproval(
  monks: Monk[],
  monkId: string,
  action: 'approve' | 'sick' | 'skip'
): Monk[] {
  return monks.map(m => {
    if (m.id !== monkId) return m;
    
    switch (action) {
      case 'approve':
        return {
          ...m,
          queueScore: Math.max(...monks.map(x => x.queueScore)) + 1,
          totalAssignments: m.totalAssignments + 1,
          isFrozen: false,
        };
      case 'sick':
        return { ...m, isFrozen: true };
      case 'skip':
        return {
          ...m,
          queueScore: Math.max(...monks.map(x => x.queueScore)) + 1,
          isFrozen: false,
        };
      default:
        return m;
    }
  });
}
