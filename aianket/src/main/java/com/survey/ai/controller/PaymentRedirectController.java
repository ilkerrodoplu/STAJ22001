package com.survey.ai.controller;


import com.survey.ai.entity.PayTRTransaction;
import com.survey.ai.repository.PayTRTransactionRepository;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.view.RedirectView;

@Controller
@RequestMapping("/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentRedirectController {

    private final PayTRTransactionRepository transactionRepository;

    /** Panelin adresi; tek kaynak app.frontend.url (bkz. application.properties). */
    @Value("${app.frontend.url}")
    private String frontendUrl;

    @GetMapping("/success")
    public String paymentSuccess(
            @RequestParam(required = false) String merchant_oid,
            @RequestParam(required = false) String status,
            Model model) {

        log.info("Payment success page accessed: merchant_oid={}, status={}", merchant_oid, status);

        model.addAttribute("merchantOid", merchant_oid);
        model.addAttribute("status", status);
        model.addAttribute("success", true);
        model.addAttribute("frontendUrl", frontendUrl);

        // Transaction bilgilerini al
        if (merchant_oid != null) {
            PayTRTransaction transaction = transactionRepository.findByMerchantOid(merchant_oid)
                    .orElse(null);

            if (transaction != null) {
                model.addAttribute("amount", transaction.getAmount());
                model.addAttribute("companyId", transaction.getCompanyId());
                model.addAttribute("planId", transaction.getPlanId());
            }
        }

        return "payment-result"; // payment-result.html template'i
    }

    @GetMapping("/failed")
    public String paymentFailed(
            @RequestParam(required = false) String merchant_oid,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String error,
            Model model) {

        log.warn("Payment failed page accessed: merchant_oid={}, status={}, error={}", merchant_oid, status, error);

        model.addAttribute("merchantOid", merchant_oid);
        model.addAttribute("status", status);
        model.addAttribute("error", error);
        model.addAttribute("success", false);
        model.addAttribute("frontendUrl", frontendUrl);

        return "payment-result"; // Aynı template, farklı veriler
    }

    // Alternatif: Frontend'e redirect
    @GetMapping("/success-redirect")
    public RedirectView paymentSuccessRedirect(@RequestParam(required = false) String merchant_oid) {
        log.info("Redirecting to frontend success page: {}", merchant_oid);

        String target = frontendUrl + "/dashboard?payment=success";
        if (merchant_oid != null) {
            target += "&merchant_oid=" + merchant_oid;
        }

        return new RedirectView(target);
    }

    @GetMapping("/failed-redirect")
    public RedirectView paymentFailedRedirect(@RequestParam(required = false) String merchant_oid) {
        log.warn("Redirecting to frontend failed page: {}", merchant_oid);

        String target = frontendUrl + "/pricing?payment=failed";
        if (merchant_oid != null) {
            target += "&merchant_oid=" + merchant_oid;
        }

        return new RedirectView(target);
    }
}