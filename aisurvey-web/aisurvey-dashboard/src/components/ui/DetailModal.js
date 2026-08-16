import React from 'react';
import { X } from 'lucide-react';

/**
 * Listelerdeki "ayrıntı" butonunun açtığı pencere: kaydın alanlarını etiket/değer
 * olarak gösterir. Süper admin listeleri, anket içeriği ve yanıt cevapları aynı
 * pencereyi kullanır; yalnız etiket/değer yetmeyen yerlerde children verilir.
 */
export default function DetailModal({ title, rows = [], onClose, children }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 p-4">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                        aria-label="Kapat"
                    >
                        <X size={20} />
                    </button>
                </div>

                <dl className="divide-y divide-gray-200">
                    {rows.filter(row => row).map(([label, value]) => (
                        <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm">
                            <dt className="font-medium text-gray-600">{label}</dt>
                            <dd className="col-span-2 break-words text-gray-900">
                                {value === null || value === undefined || value === '' ? '-' : value}
                            </dd>
                        </div>
                    ))}
                </dl>

                {children && <div className="border-t border-gray-200 p-4">{children}</div>}
            </div>
        </div>
    );
}
