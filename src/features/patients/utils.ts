import { Patient, Treatment } from '@/lib/types';

// Helper to determine patient status
export const getPatientStatus = (p: Patient & { treatments?: Treatment[] }) => {
    if (!p.treatments) return 'active';

    const totalCost = p.treatments.reduce((sum, t) => sum + (t.cost || 0), 0);
    const totalPaid = p.treatments.reduce((sum, t) => sum + (t.payment_amount || 0), 0);
    const hasDebt = totalCost > totalPaid;

    if (hasDebt) return 'debt';

    const hasPlanned = p.treatments.some(t => t.status === 'planned');
    if (hasPlanned) return 'planned';

    return 'active';
};
