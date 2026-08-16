package com.survey.ai.service;

import com.survey.ai.entity.PaymentPlan;
import com.survey.ai.repository.PaymentPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentPlanInitService implements CommandLineRunner {

    private final PaymentPlanRepository paymentPlanRepository;

    @Override
    public void run(String... args) throws Exception {
        // Eğer plan yoksa örnek planları ekle
        if (paymentPlanRepository.count() == 0) {
            initializePlans();
        }
    }

    private void initializePlans() {
        List<PaymentPlan> plans = Arrays.asList(
                createBasicPlan(),
                createPlusPlan(),
                createProPlan()
        );

        paymentPlanRepository.saveAll(plans);
        System.out.println("✅ Payment plans initialized successfully!");
    }

    private PaymentPlan createBasicPlan() {
        PaymentPlan plan = new PaymentPlan(
                "Basic",
                "Basic Paket",
                "3 anket oluşturma • 10 soru/anket • Rapor Ekranları • CSV raporlar",
                "9600 TL",
                9600.0,
                1000.0,
                3,
                10,
                1000,
                Arrays.asList(
                        "Deneme: 1 ay ücretsiz",
                        "3 Anket oluşturma",
                        "Rapor Ekranları",
                        "Star (1-5 derecelendirme) ve Metin Cevapları"
                )
        );

        plan.setFree(true);
        plan.setHasTrialAccess(true);
        plan.setHasReports(true);
        plan.setHasCsvExport(true);

        return plan;
    }

    private PaymentPlan createPlusPlan() {
        PaymentPlan plan = new PaymentPlan(
                "Plus",
                "Plus Paket",
                "5 anket kapasitesi • 20 soru/anket • Rapor Ekranları • CSV raporlar • Gelişmiş AI öngürüleri",
                "16200 TL",
                16200.0,
                1800.0,
                5,
                20,
                10000,
                Arrays.asList(
                        "Deneme: 1 ay ücretsiz",
                        "5 anket oluşturma",
                        "Rapor ekranları ve entegrasyonlar",
                        "Gelişmiş AI öngürüleri"
                )
        );

        plan.setHasTrialAccess(true);
        plan.setHasReports(true);
        plan.setHasCsvExport(true);
        plan.setHasAdvancedAI(true);
        plan.setHasIntegrations(true);

        return plan;
    }

    private PaymentPlan createProPlan() {
        PaymentPlan plan = new PaymentPlan(
                "Pro",
                "Pro AI Paket",
                "Sınırsız Anket • AI Yorum Analizi • Gelişmiş AI Öngürüleri • Haftalık AI Stratejileri",
                "20160 TL",
                20160.0,
                2400.0,
                25,
                25,
                50000,
                Arrays.asList(
                        "Deneme: 1 ay ücretsiz",
                        "Sınırsız Anket / Soru",
                        "Gerçek Zamanlı Analiz & Entegrasyonlar",
                        "Gelişmiş AI öngürüleri"
                )
        );

        plan.setHasTrialAccess(true);
        plan.setHasReports(true);
        plan.setHasCsvExport(true);
        plan.setHasAdvancedAI(true);
        plan.setHasRealTimeAnalysis(true);
        plan.setHasUnlimitedSurveys(true);
        plan.setHasWeeklyAIStrategies(true);
        plan.setHasIntegrations(true);

        return plan;
    }
}