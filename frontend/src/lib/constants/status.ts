export type RopaStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

// Fixed status palette — never themed, distinct from the brand gold/yellow scale.
export const STATUS_COLORS: Record<RopaStatus, string> = {
  DRAFT: '#898781',
  SUBMITTED: '#fab219',
  APPROVED: '#0ca30c',
  REJECTED: '#d03b3b',
};

export const STATUSES: RopaStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
