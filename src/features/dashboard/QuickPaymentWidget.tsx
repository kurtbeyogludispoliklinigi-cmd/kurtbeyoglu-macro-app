import { Wallet, ArrowRight } from 'lucide-react';
import { Doctor } from '@/lib/types';

interface QuickPaymentWidgetProps {
    currentUser: Doctor;
    onOpen: () => void;
    totalPending: number;
}

export function QuickPaymentWidget({ currentUser, onOpen, totalPending }: QuickPaymentWidgetProps) {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                        <Wallet className="text-teal-600 dark:text-teal-400" size={20} />
                    </div>
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white">Tahsilat</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Bekleyen Toplam</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {totalPending.toLocaleString('tr-TR')} ₺
                    </p>
                </div>

                <button
                    onClick={onOpen}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-medium transition-all active:scale-[0.98] shadow-lg shadow-teal-500/20"
                >
                    <span>Hızlı Ödeme Al</span>
                    <ArrowRight size={18} />
                </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                    İsim ile arama yapıp ödeme alabilirsiniz.
                </p>
            </div>
        </div>
    );
}
