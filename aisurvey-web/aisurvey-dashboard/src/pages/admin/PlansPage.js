
import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Star, Loader2 } from 'lucide-react';

export default function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [billingCycle, setBillingCycle] = useState('MONTHLY');
    const [processing, setProcessing] = useState(false);
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
        fetchPlans();
        fetchSubscription();
    }, []);

    const fetchPlans = async () => {
        try {
            const response = await fetch('/api/v1/payments/plans');
            const data = await response.json();
            setPlans(data);
        } catch (error) {
            console.error('Planlar yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubscription = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const response = await fetch(`/api/v1/payments/subscription/${user.companyId}`);
                if (response.ok) {
                    const data = await response.json();
                    setSubscription(data);
                }
            }
        } catch (error) {
            console.error('Abonelik bilgisi alınamadı:', error);
        }
    };

    const handleStartTrial = async () => {
        try {
            setProcessing(true);
            const userData = localStorage.getItem('user');
            const user = JSON.parse(userData);

            const response = await fetch('/api/v1/payments/start-trial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: user.companyId })
            });

            if (response.ok) {
                alert('🎉 Deneme sürümünüz başlatıldı! 30 gün boyunca tüm özellikleri ücretsiz kullanabilirsiniz.');
                fetchSubscription();
            }
        } catch (error) {
            alert('Hata oluştu: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleSubscribe = async (plan) => {
        try {
            setProcessing(true);
            const userData = localStorage.getItem('user');
            const user = JSON.parse(userData);

            const response = await fetch('/api/v1/payments/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: user.companyId,
                    planId: plan.id,
                    billingCycle: billingCycle
                })
            });

            const result = await response.json();

            if (result.success) {
                // PayTR ödeme formunu aç
                window.open(result.paytrUrl, '_blank');
            } else {
                alert('Ödeme başlatılamadı: ' + result.error);
            }
        } catch (error) {
            alert('Hata oluştu: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const getPlanIcon = (planName) => {
        if (planName.toLowerCase().includes('premium')) return <Crown className="w-8 h-8 text-purple-500" />;
        if (planName.toLowerCase().includes('pro')) return <Star className="w-8 h-8 text-blue-500" />;
        return <Zap className="w-8 h-8 text-green-500" />;
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(price);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-500">Planlar yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
                            Anket AI Plus ile Anketleriniz Daha Kolay
                        </h1>
                        <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                            1 ay ücretsiz deneme, ardından düşük ücretli aylık abonelik modeli.
                            Minimum paketler ile esnek kullanım.
                        </p>

                        {/* Trial Banner */}
                        {!subscription && (
                            <div className="mt-8 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl p-6 max-w-2xl mx-auto">
                                <div className="flex items-center justify-center space-x-4">
                                    <Zap className="w-6 h-6" />
                                    <div>
                                        <h3 className="text-lg font-semibold">30 Gün Ücretsiz Deneme!</h3>
                                        <p className="text-sm opacity-90">Tüm özellikleri risk-free keşfedin</p>
                                    </div>
                                    <button
                                        onClick={handleStartTrial}
                                        disabled={processing}
                                        className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
                                    >
                                        {processing ? 'Başlatılıyor...' : 'Denemeyi Başlat'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Current Subscription */}
                        {subscription && (
                            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-2xl mx-auto">
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-blue-900">
                                        Mevcut Aboneliğiniz: {subscription.status === 'TRIAL' ? 'Deneme Sürümü' : 'Aktif'}
                                    </h3>
                                    <p className="text-blue-700 mt-1">
                                        {subscription.status === 'TRIAL'
                                            ? `Deneme sürümünüz ${new Date(subscription.trialEndDate).toLocaleDateString('tr-TR')} tarihinde sona erecek`
                                            : `Aboneliğiniz ${new Date(subscription.endDate).toLocaleDateString('tr-TR')} tarihinde yenilenecek`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Billing Toggle */}
                        <div className="mt-8 flex justify-center">
                            <div className="bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setBillingCycle('MONTHLY')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        billingCycle === 'MONTHLY'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    Aylık Ödeme
                                </button>
                                <button
                                    onClick={() => setBillingCycle('YEARLY')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        billingCycle === 'YEARLY'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    Yıllık Ödeme
                                    <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        2 ay bedava
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PlansPage Grid */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {plans.map((plan) => {
                        const price = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;
                        const monthlyPrice = billingCycle === 'YEARLY' ? plan.yearlyPrice / 12 : plan.monthlyPrice;

                        const priceDiscount = ((plan.monthlyPrice * 12 - plan.yearlyPrice) / (plan.monthlyPrice * 12)) * 100;
                        return (
                            <div key={plan.id} className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-blue-200 transition-all duration-300">
                                <div className="p-8">
                                    {/* Plan Header */}
                                    <div className="text-center mb-8">
                                        <div className="flex justify-center mb-4">
                                            {getPlanIcon(plan.name)}
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                                        <p className="text-gray-500 mt-2">{plan.description}</p>
                                    </div>

                                    {/* Pricing */}
                                    <div className="text-center mb-8">
                                        <div className="text-4xl font-bold text-gray-900 mb-2">
                                            {formatPrice(monthlyPrice)}
                                            <span className="text-lg text-gray-500 font-normal">/ay</span>
                                        </div>
                                        {billingCycle === 'YEARLY' && (
                                            <div className="text-sm text-green-600">
                                                Yıllık: {formatPrice(price)} ✨ %{priceDiscount} tasarruf
                                            </div>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center">
                                            <Check className="w-5 h-5 text-green-500 mr-3" />
                                            <span className="text-gray-600">{plan.surveyLimit} Anket Limiti</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Check className="w-5 h-5 text-green-500 mr-3" />
                                            <span className="text-gray-600">{plan.responseLimit} Cevap Limiti</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Check className="w-5 h-5 text-green-500 mr-3" />
                                            <span className="text-gray-600">{plan.userLimit} Kullanıcı</span>
                                        </div>
                                        {plan.hasAdvancedAnalytics && (
                                            <div className="flex items-center">
                                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                                <span className="text-gray-600">Gelişmiş Analitik</span>
                                            </div>
                                        )}
                                        {plan.hasApiAccess && (
                                            <div className="flex items-center">
                                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                                <span className="text-gray-600">API Erişimi</span>
                                            </div>
                                        )}
                                        <div className="flex items-center">
                                            <Check className="w-5 h-5 text-green-500 mr-3" />
                                            <span className="text-gray-600">
                                                {plan.hasPrioritySupport ? 'Öncelikli' : 'Email'} Destek
                                            </span>
                                        </div>
                                    </div>

                                    {/* CTA Button */}
                                    <button
                                        onClick={() => handleSubscribe(plan)}
                                        disabled={processing}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? (
                                            <div className="flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                İşleniyor...
                                            </div>
                                        ) : (
                                            `Bu Planı Seç - ${formatPrice(monthlyPrice)}/ay`
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* FAQ Section */}
                <div className="mt-24">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                        Sıkça Sorulan Sorular
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="font-semibold text-gray-900 mb-2">Deneme süresi nasıl çalışır?</h3>
                            <p className="text-gray-600 text-sm">30 gün boyunca tüm özellikleri ücretsiz kullanabilirsiniz. Kredi kartı bilgisi gerekmez.</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="font-semibold text-gray-900 mb-2">Aboneliği nasıl iptal edebilirim?</h3>
                            <p className="text-gray-600 text-sm">Hesap ayarlarından istediğiniz zaman aboneliğinizi iptal edebilirsiniz.</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="font-semibold text-gray-900 mb-2">Güvenli ödeme yapıyor muyum?</h3>
                            <p className="text-gray-600 text-sm">Evet! PayTR ile SSL şifrelemesi kullanarak güvenli ödeme yapabilirsiniz.</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="font-semibold text-gray-900 mb-2">Plan yükseltmesi yapabilir miyim?</h3>
                            <p className="text-gray-600 text-sm">Evet, istediğiniz zaman planınızı yükseltebilir veya düşürebilirsiniz.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
