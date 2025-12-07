// CSV Export Utility for DentistNote Pro

interface Treatment {
    id: string;
    patient_id: string;
    tooth_no: string;
    procedure: string;
    cost: number;
    notes: string;
    created_at: string;
    added_by: string;
}

interface Patient {
    id: string;
    doctor_id: string;
    doctor_name: string;
    name: string;
    phone: string;
    anamnez: string;
    updated_at: string;
}

interface DateRange {
    from: Date | null;
    to: Date | null;
}

export function generateIncomeCsv(
    treatments: Treatment[],
    patients: Patient[],
    dateRange?: DateRange
): void {
    // Filter by date range if provided
    let filteredTreatments = treatments;
    if (dateRange?.from) {
        filteredTreatments = filteredTreatments.filter(
            t => new Date(t.created_at) >= dateRange.from!
        );
    }
    if (dateRange?.to) {
        filteredTreatments = filteredTreatments.filter(
            t => new Date(t.created_at) <= dateRange.to!
        );
    }

    // Build CSV content
    const headers = ['Tarih', 'Hasta', 'Hekim', 'Diş No', 'İşlem', 'Ücret (TL)', 'Notlar'];
    const rows = filteredTreatments.map(t => {
        const patient = patients.find(p => p.id === t.patient_id);
        return [
            new Date(t.created_at).toLocaleDateString('tr-TR'),
            patient?.name || 'Bilinmiyor',
            patient?.doctor_name || 'Bilinmiyor',
            t.tooth_no || '-',
            t.procedure,
            t.cost.toString(),
            t.notes || '-'
        ];
    });

    // Calculate total
    const total = filteredTreatments.reduce((sum, t) => sum + (t.cost || 0), 0);
    rows.push(['', '', '', '', 'TOPLAM', total.toString(), '']);

    // Convert to CSV format
    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    // Add BOM for Excel Turkish character support
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gelir-raporu-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function generatePatientCsv(patients: Patient[]): void {
    const headers = ['Ad Soyad', 'Telefon', 'Hekim', 'Anamnez', 'Son Güncelleme'];
    const rows = patients.map(p => [
        p.name,
        p.phone || '-',
        p.doctor_name || 'Bilinmiyor',
        p.anamnez || '-',
        p.updated_at ? new Date(p.updated_at).toLocaleDateString('tr-TR') : '-'
    ]);

    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hasta-listesi-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
