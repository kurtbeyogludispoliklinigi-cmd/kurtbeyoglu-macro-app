// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
};

export function PatientList({
    patients,
    selectedPatientId,
    onSelectPatient,
    currentUser
}: PatientListProps) {
    if (patients.length === 0) {
        return (
            <div className="text-center p-8 text-gray-400">
                <p>Kayıt bulunamadı.</p>
            </div>
        );
    }

    return (
        <ul>
            {patients.map(p => {
                const status = getPatientStatus(p);

                // RICH DATA CALCULATIONS
                // 1. Last Visit: Based on last completed treatment date or updated_at
                const lastTreatment = p.treatments?.filter(t => t.status === 'completed')
                    .sort((a, b) => new Date(b.completed_date || 0).getTime() - new Date(a.completed_date || 0).getTime())[0];

                const lastVisitDate = lastTreatment?.completed_date ? new Date(lastTreatment.completed_date) :
                    (p.updated_at ? new Date(p.updated_at) : null);

                // 2. Debt Calculation (Simple: Sum of non-paid completed treatments, or just total debt if we had payments)
                // Since we don't have payments array here (only treatments), we'll estimate or just show "Borçlu" status.
                // However, PatientWithTreatments interface usually implies we might have what we need. 
                // Let's assume for now we show what we know. If 'debt' status, show visually.

                // 3. Last Procedure Name
                const lastProcedureName = lastTreatment?.treatment_name;

                return (
                    <li
                        key={p.id}
                        onClick={() => onSelectPatient(p.id)}
                        className={cn(
                            "p-3 border-b cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-700 transition relative group",
                            selectedPatientId === p.id && 'bg-teal-50 dark:bg-slate-700 border-l-4 border-l-teal-600',
                            // Status Border
                            selectedPatientId !== p.id && status === 'debt' && 'border-l-4 border-l-red-500',
                            selectedPatientId !== p.id && status === 'planned' && 'border-l-4 border-l-blue-500',
                            selectedPatientId !== p.id && status === 'active' && 'border-l-4 border-l-transparent'
                        )}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0"> {/* min-w-0 for text truncation */}
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{p.name}</h3>
                                    {status === 'debt' && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 whitespace-nowrap">
                                            Borçlu: {formatCurrency((p.treatments?.reduce((sum, t) => sum + (t.cost || 0), 0) || 0) - (p.treatments?.reduce((sum, t) => sum + (t.payment_amount || 0), 0) || 0))}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                    {/* Row 1: Phone & Last Visit */}
                                    <div className="flex items-center gap-1">
                                        <Phone size={10} className="shrink-0" />
                                        <span className="truncate">{formatPhoneNumber(p.phone || '')}</span>
                                    </div>
                                    <div className="flex items-center gap-1 justify-end text-slate-400">
                                        {lastVisitDate && (
                                            <>
                                                <span>Son:</span>
                                                <span className="font-medium text-slate-600 dark:text-slate-300">
                                                    {lastVisitDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: '2-digit' })}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Row 2: Last Procedure (Full width or split) */}
                                    {lastProcedureName && (
                                        <div className="col-span-2 text-slate-600 dark:text-slate-400 truncate flex items-center gap-1 border-t border-slate-100 dark:border-slate-700 pt-1 mt-1">
                                            <span className="italic opacity-80">İşlem:</span> {lastProcedureName}
                                        </div>
                                    )}

                                    {/* Row 3: Admin/Banko info */}
                                    {(currentUser.role === 'admin' || currentUser.role === 'banko') && (
                                        <div className="col-span-2 mt-1">
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded text-slate-500">
                                                {p.doctor_name || '-'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
