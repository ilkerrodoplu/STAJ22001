import React, {useEffect, useState} from 'react';
import {useSearchParams, useNavigate} from 'react-router-dom';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const merchantOid = searchParams.get('merchant_oid');
    const status = searchParams.get('status');

    useEffect(() => {
        // Ödeme durumunu kontrol et
        if (merchantOid) {
            // Backend'e ödeme durumu sorgu
            checkPaymentStatus(merchantOid);
        }

        setTimeout(() => setLoading(false), 2000);
    }, [merchantOid]);

    const checkPaymentStatus = async (oid) => {
        try {
            const response = await fetch(`/api/v1/payments/status/${oid}`);
            const data = await response.json();
            console.log('Payment status:', data);
        } catch (error) {
            console.error('Payment status check failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                    <p className="mt-4">Ödeme durumu kontrol ediliyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-6">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Ödeme Başarılı! 🎉
                </h1>

                <p className="text-gray-600 mb-6">
                    Aboneliğiniz başarıyla aktifleştirildi. Artık tüm premium özellikleri kullanabilirsiniz.
                </p>

                {merchantOid && (
                    <div className="bg-gray-50 rounded p-3 mb-6">
                        <p className="text-sm text-gray-600">
                            İşlem No: <span className="font-mono">{merchantOid}</span>
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Dashboard'a Git
                    </button>

                    <button
                        onClick={() => navigate('/admin/survey-templates')}
                        className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Anket Oluştur
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
