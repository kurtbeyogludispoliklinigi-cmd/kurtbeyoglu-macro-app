import React from 'react';
import { Check, X, User, Calendar, CreditCard } from 'lucide-react';

interface AIConfirmationCardsProps {
    toolInvocation: any;
    onConfirm: (toolCallId: string, result: string) => void;
    onCancel: (toolCallId: string) => void;
}

export function AIConfirmationCards({ toolInvocation, onConfirm, onCancel }: AIConfirmationCardsProps) {
    const { toolName, toolCallId, args } = toolInvocation;

    if (toolName === 'createPatient') {
        return (
            <div className="bg-white border text-gray-800 rounded-xl p-4 shadow-sm my-2">
                <div className="flex items-center gap-2 mb-2 text-teal-700 font-bold border-b pb-2">
                    <User size={18} />
                    <span>Yeni Hasta Ekle</span>
                </div>
                <div className="space-y-1 text-sm mb-3">
                    <p><span className="font-semibold">İsim:</span> {args.name}</p>
                    <p><span className="font-semibold">Tel:</span> {args.phone}</p>
                    {args.anamnez && <p><span className="font-semibold">Not:</span> {args.anamnez}</p>}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onCancel(toolCallId)}
                        className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold"
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => onConfirm(toolCallId, 'Kayıt Onaylandı')}
                        className="flex-1 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-xs font-bold flex items-center justify-center gap-1"
                    >
                        <Check size={14} /> Onayla
                    </button>
                </div>
            </div>
        );
    }

    if (toolName === 'createAppointment') {
        return (
            <div className="bg-white border text-gray-800 rounded-xl p-4 shadow-sm my-2">
                <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold border-b pb-2">
                    <Calendar size={18} />
                    <span>Randevu Oluştur</span>
                </div>
                <div className="space-y-1 text-sm mb-3">
                    <p><span className="font-semibold">Hasta:</span> {args.patientName}</p>
                    <p><span className="font-semibold">Tarih:</span> {args.date}</p>
                    <p><span className="font-semibold">Saat:</span> {args.time}</p>
                    {args.notes && <p><span className="font-semibold">Not:</span> {args.notes}</p>}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onCancel(toolCallId)}
                        className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold"
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => onConfirm(toolCallId, 'Randevu Onaylandı')}
                        className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold flex items-center justify-center gap-1"
                    >
                        <Check size={14} /> Onayla
                    </button>
                </div>
            </div>
        );
    }

    if (toolName === 'createTreatment') {
        return (
            <div className="bg-white border text-gray-800 rounded-xl p-4 shadow-sm my-2">
                <div className="flex items-center gap-2 mb-2 text-orange-700 font-bold border-b pb-2">
                    <CreditCard size={18} />
                    <span>İşlem/Ödeme Ekle</span>
                </div>
                <div className="space-y-1 text-sm mb-3">
                    <p><span className="font-semibold">Hasta:</span> {args.patientName}</p>
                    <p><span className="font-semibold">İşlem:</span> {args.procedure}</p>
                    <p><span className="font-semibold">Tutar:</span> {args.cost} TL</p>
                    {args.toothNo && <p><span className="font-semibold">Diş:</span> {args.toothNo}</p>}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onCancel(toolCallId)}
                        className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold"
                    >
                        İptal
                    </button>
                    <button
                        onClick={() => onConfirm(toolCallId, 'İşlem Onaylandı')}
                        className="flex-1 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold flex items-center justify-center gap-1"
                    >
                        <Check size={14} /> Onayla
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2 bg-gray-100 border rounded text-xs text-gray-500">
            Bilinmeyen Aksiyon: {toolName}
        </div>
    );
}
