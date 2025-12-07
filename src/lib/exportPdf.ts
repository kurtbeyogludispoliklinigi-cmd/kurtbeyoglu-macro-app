// PDF Export Utility for DentistNote Pro
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Turkish character replacement for PDF (basic font doesn't support Turkish chars)
function turkishToAscii(text: string): string {
    const map: Record<string, string> = {
        'ş': 's', 'Ş': 'S',
        'ğ': 'g', 'Ğ': 'G',
        'ü': 'u', 'Ü': 'U',
        'ö': 'o', 'Ö': 'O',
        'ç': 'c', 'Ç': 'C',
        'ı': 'i', 'İ': 'I'
    };
    return text.replace(/[şŞğĞüÜöÖçÇıİ]/g, char => map[char] || char);
}

export function generatePatientReport(
    patient: Patient,
    treatments: Treatment[]
): void {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136); // Teal color
    doc.text('DentistNote Pro', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Hasta Tedavi Raporu', 14, 28);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 150, 20);

    // Patient Info
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(turkishToAscii(`Hasta: ${patient.name}`), 14, 45);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Telefon: ${patient.phone || '-'}`, 14, 52);
    doc.text(`Hekim: ${turkishToAscii(patient.doctor_name || '-')}`, 14, 58);

    if (patient.anamnez) {
        doc.setTextColor(180, 0, 0);
        doc.text(`Anamnez: ${turkishToAscii(patient.anamnez)}`, 14, 66);
    }

    // Treatments Table
    const tableData = treatments.map(t => [
        new Date(t.created_at).toLocaleDateString('tr-TR'),
        t.tooth_no || '-',
        turkishToAscii(t.procedure),
        `${t.cost} TL`,
        turkishToAscii(t.notes || '-')
    ]);

    autoTable(doc, {
        startY: patient.anamnez ? 75 : 68,
        head: [['Tarih', 'Dis No', 'Islem', 'Ucret', 'Notlar']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [13, 148, 136],
            textColor: 255
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 20 },
            2: { cellWidth: 50 },
            3: { cellWidth: 25 },
            4: { cellWidth: 'auto' }
        }
    });

    // Total
    const total = treatments.reduce((sum, t) => sum + (t.cost || 0), 0);
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 100;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Toplam Tutar: ${total.toLocaleString('tr-TR')} TL`, 14, finalY + 15);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Bu rapor DentistNote Pro tarafindan olusturulmustur.', 14, 285);

    // Download
    doc.save(`${turkishToAscii(patient.name).replace(/\s+/g, '-')}-rapor.pdf`);
}

export function generateIncomeReport(
    treatments: Treatment[],
    patients: Patient[],
    dateRange?: { from: Date | null; to: Date | null }
): void {
    const doc = new jsPDF();

    // Filter by date range
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

    // Header
    doc.setFontSize(20);
    doc.setTextColor(13, 148, 136);
    doc.text('DentistNote Pro', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Gelir Raporu', 14, 28);
    doc.text(`Olusturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 130, 20);

    if (dateRange?.from || dateRange?.to) {
        const fromStr = dateRange?.from ? dateRange.from.toLocaleDateString('tr-TR') : '-';
        const toStr = dateRange?.to ? dateRange.to.toLocaleDateString('tr-TR') : '-';
        doc.text(`Donem: ${fromStr} - ${toStr}`, 130, 26);
    }

    // Table
    const tableData = filteredTreatments.map(t => {
        const patient = patients.find(p => p.id === t.patient_id);
        return [
            new Date(t.created_at).toLocaleDateString('tr-TR'),
            turkishToAscii(patient?.name || '-'),
            turkishToAscii(patient?.doctor_name || '-'),
            turkishToAscii(t.procedure),
            `${t.cost} TL`
        ];
    });

    autoTable(doc, {
        startY: 40,
        head: [['Tarih', 'Hasta', 'Hekim', 'Islem', 'Ucret']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [13, 148, 136],
            textColor: 255
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        }
    });

    // Total
    const total = filteredTreatments.reduce((sum, t) => sum + (t.cost || 0), 0);
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 100;

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`Toplam Gelir: ${total.toLocaleString('tr-TR')} TL`, 14, finalY + 15);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Toplam Islem: ${filteredTreatments.length}`, 14, finalY + 23);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Bu rapor DentistNote Pro tarafindan olusturulmustur.', 14, 285);

    // Download
    doc.save(`gelir-raporu-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`);
}
