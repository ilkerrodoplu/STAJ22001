package com.survey.ai.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    /** Şablonlarda ve konu satırlarında tek marka adı kullanılsın. */
    private static final String BRAND = "AI Destekli Anket Platformu";

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    // SMTP kullanıcı adı her zaman geçerli bir gönderen adresi değildir
    // (Resend'de kullanıcı adı "resend"), bu yüzden From ayrı tutulur.
    @Value("${app.mail.from:${spring.mail.username:}}")
    private String fromEmail;

    /** Sıfırlama bağlantısının ömrü; e-postada yazan süre kodla aynı olmalı. */
    @Value("${app.jwt.password-reset.expiration-minutes:15}")
    private long passwordResetExpirationMinutes;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Async
    public void sendWelcomeEmail(String to, String name) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("name", name);
            variables.put("loginUrl", loginUrl());

            String content = processTemplate("welcome-email", variables);
            sendEmail(to, "Hoş Geldiniz - " + BRAND, content);

            logger.info("Welcome email sent to {}", to);
        } catch (Exception e) {
            logger.error("Error sending welcome email to {}: {}", to, e.getMessage(), e);
        }
    }

    @Async
    public void sendPasswordResetEmail(String to, String name, String token) {
        try {
            String content = processTemplate("password-reset-email", resetVariables(name, token));
            sendEmail(to, "Şifre Sıfırlama Talebi - " + BRAND, content);

            logger.info("Password reset email sent to {}", to);
        } catch (Exception e) {
            logger.error("Error sending password reset email to {}: {}", to, e.getMessage(), e);
        }
    }

    /**
     * Israrlı hatalı giriş sonrası kilitlenen hesabın sahibine gider: kilidin
     * tek çıkış yolu bu bağlantıdır.
     */
    @Async
    public void sendAccountLockedEmail(String to, String name, String token) {
        try {
            String content = processTemplate("account-locked-email", resetVariables(name, token));
            sendEmail(to, "Hesabınız Kilitlendi - " + BRAND, content);

            logger.info("Account locked email sent to {}", to);
        } catch (Exception e) {
            logger.error("Error sending account locked email to {}: {}", to, e.getMessage(), e);
        }
    }

    /**
     * Sıfırlama bağlantısı iki e-postada da aynı. Geçerlilik süresi ayardan
     * okunur; şablonda "24 saat" yazıyordu ama kod 15 dakikalık token üretiyor,
     * yani kullanıcıya yanlış bilgi veriliyordu.
     */
    private Map<String, Object> resetVariables(String name, String token) {
        Map<String, Object> variables = new HashMap<>();
        variables.put("name", name);
        variables.put("resetUrl", frontendUrl + "/auth/reset-password?token=" + token);
        variables.put("expiresIn", passwordResetExpirationMinutes + " dakika");
        return variables;
    }

    @Async
    public void sendPasswordChangedEmail(String to, String name) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("name", name);
            variables.put("loginUrl", loginUrl());

            String content = processTemplate("password-changed-email", variables);
            sendEmail(to, "Şifreniz Değiştirildi - " + BRAND, content);

            logger.info("Password changed email sent to {}", to);
        } catch (Exception e) {
            logger.error("Error sending password changed email to {}: {}", to, e.getMessage(), e);
        }
    }

    /** Yanıt sayfasının adresi çağıranın işi değil; frontend adresi zaten burada. */
    @Async
    public void sendNewResponseNotification(String to, String name, String companyName, String surveyName) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("name", name);
            variables.put("companyName", companyName);
            variables.put("surveyName", surveyName);
            variables.put("responseUrl", frontendUrl + "/admin/responses");

            String content = processTemplate("new-response-notification", variables);
            sendEmail(to, "Yeni Anket Yanıtı - " + companyName, content);

            logger.info("New response notification email sent to {}", to);
        } catch (Exception e) {
            logger.error("Error sending response notification email to {}: {}", to, e.getMessage(), e);
        }
    }

    /** Site admininin uygunsuz bulduğu anket için şirket sahibine uyarı. */
    @Async
    public void sendSurveyWarningEmail(String to, String name, String surveyName, String reason, int graceDays) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("name", name);
            variables.put("surveyName", surveyName);
            variables.put("reason", reason);
            variables.put("graceDays", graceDays);
            variables.put("surveysUrl", frontendUrl + "/admin/survey-templates");

            String content = processTemplate("survey-warning-email", variables);
            sendEmail(to, "Anketiniz Hakkında Uyarı - " + surveyName, content);

            logger.info("Survey warning email sent to {}", to);
        } catch (Exception e) {
            logger.error("Error sending survey warning email to {}: {}", to, e.getMessage(), e);
        }
    }

    /** Uyarı sonrası düzeltilmediği için silinen anket bildirimi. */
    @Async
    public void sendSurveyDeletedEmail(String to, String name, String surveyName, int graceDays) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("name", name);
            variables.put("surveyName", surveyName);
            variables.put("graceDays", graceDays);
            variables.put("messagesUrl", frontendUrl + "/admin/messages");

            String content = processTemplate("survey-deleted-email", variables);
            sendEmail(to, "Anketiniz Silindi - " + surveyName, content);

            logger.info("Survey deleted email sent to {}", to);
        } catch (Exception e) {
            logger.error("Error sending survey deleted email to {}: {}", to, e.getMessage(), e);
        }
    }

    /**
     * Şirket ↔ süper admin mesajlaşmasında karşı tarafa haber.
     *
     * @param toSiteAdmin alıcı süper adminse true. Yazışma sayfası iki tarafta
     *                    ayrı adrestedir; herkese /admin/messages gönderildiğinde
     *                    süper admin şirket sayfasına düşüp "erişiminiz yok"
     *                    ekranıyla karşılaşıyordu.
     */
    @Async
    public void sendSupportMessageEmail(String to, String name, String fromLabel, String preview,
                                        boolean toSiteAdmin) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("name", name);
            variables.put("fromLabel", fromLabel);
            variables.put("preview", preview);
            variables.put("messagesUrl", frontendUrl
                    + (toSiteAdmin ? "/admin/super/messages" : "/admin/messages"));

            String content = processTemplate("support-message-email", variables);
            sendEmail(to, "Yeni Mesajınız Var - " + fromLabel, content);

            logger.info("Support message email sent to {}", to);
        } catch (Exception e) {
            logger.error("Error sending support message email to {}: {}", to, e.getMessage(), e);
        }
    }

    /** Giriş ekranı /admin/login altında; e-postalar uzun süre /auth/login'e yönlendiriyordu. */
    private String loginUrl() {
        return frontendUrl + "/admin/login";
    }

    private String processTemplate(String templateName, Map<String, Object> variables) {
        Context context = new Context();
        variables.forEach(context::setVariable);
        return templateEngine.process(templateName, context);
    }

    private void sendEmail(String to, String subject, String content) throws MessagingException {
        // MAIL_USERNAME tanımsızken Gmail "535 auth failed" döndürüyor; sebebi
        // yığından okumak yerine tek satırda söyleyelim.
        if (fromEmail == null || fromEmail.isBlank()) {
            logger.warn("MAIL_USERNAME tanımlı değil, e-posta gönderilmedi: {} -> {}", subject, to);
            return;
        }

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(content, true);

        mailSender.send(message);
    }
}

