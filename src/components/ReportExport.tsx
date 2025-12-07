'use client';

import { FileSpreadsheet, FileText } from 'lucide-react';
import { generatePatientReport, generateIncomeReport } from '@/lib/exportPdf';
import { generateIncomeCsv, generatePatientCsv } from '@/lib/exportCsv';

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

interface PatientReportButtonProps {
    patient: Patient;
    treatments: Treatment[];
}

export function PatientReportButton({ patient, treatments }: PatientReportButtonProps) {
    const handleExport = () => {
        generatePatientReport(patient, treatments);
    };

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 transition"
            title="PDF İndir"
        >
            <FileText size={14} />
            PDF
        </button>
    );
}

interface ExportButtonsProps {
    treatments: Treatment[];
    patients: Patient[];
    type: 'income' | 'patients';
}

export function ExportButtons({ treatments, patients, type }: ExportButtonsProps) {
    const handlePdfExport = () => {
        if (type === 'income') {
            generateIncomeReport(treatments, patients);
        }
    };

    const handleCsvExport = () => {
        if (type === 'income') {
            generateIncomeCsv(treatments, patients);
        } else {
            generatePatientCsv(patients);
        }
    };

    return (
        <div className="flex gap-2">
            {type === 'income' && (
                <button
                    onClick={handlePdfExport}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition shadow-sm"
                    title="PDF İndir"
                >
                    <FileText size={16} className="text-red-500" />
                    PDF İndir
                </button>
            )}
            <button
                onClick={handleCsvExport}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition shadow-sm"
                title="CSV İndir"
            >
                <FileSpreadsheet size={16} className="text-green-500" />
                CSV İndir
            </button>
        </div>
    );
}
