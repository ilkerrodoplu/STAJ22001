import React, {useEffect} from 'react';
import {useSearchParams, useNavigate} from 'react-router-dom';

const PaymentFailed = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const merchantOid = searchParams.get('merchant_oid');
    const status = searchParams.get('status');
    const error = searchParams.get('error');

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-6">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                        <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Ödeme Başarısız ❌
                </h1>

                <p className="text-gray-600 mb-6">
                    Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin veya farklı bir ödeme yöntemi
                    kullanın.
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-6">
                        <p className="text-sm text-red-600">
                            Hata: {error}
                        </p>
                    </div>
                )}

                {merchantOid && (
                    <div className="bg-gray-50 rounded p-3 mb-6">
                        <p className="text-sm text-gray-600">
                            İşlem No: <span className="font-mono">{merchantOid}</span>
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/admin/plans')}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Tekrar Dene
                    </button>

                    <button
                        onClick={() => navigate('/contact')}
                        className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Destek İçin İletişime Geç
                    </button>

                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="w-full text-gray-500 py-2 px-4 hover:text-gray-700 transition-colors"
                    >
                        Dashboard'a Dön
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentFailed;