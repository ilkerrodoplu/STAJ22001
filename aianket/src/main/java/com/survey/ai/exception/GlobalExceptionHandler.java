package com.survey.ai.exception;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import com.survey.ai.entity.SecurityEvent;
import com.survey.ai.service.SecurityEventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Uygulama genelinde istisnaları yakalayıp işleyen sınıf.
 * HTTP yanıtlarına uygun hata mesajları ve durumları ekler.
 */
@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    /** Yetkisiz erişim denetim kaydı; @Lazy döngüsel bağımlılığı önler. */
    @Autowired
    @Lazy
    private SecurityEventService securityEventService;

    /**
     * ResourceNotFoundException için hata işleyici
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    /**
     * ResourceAlreadyExistsException için hata işleyici
     */
    @ExceptionHandler(ResourceAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleResourceAlreadyExistsException(ResourceAlreadyExistsException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    /**
     * AuthenticationException için hata işleyici. Hatalı şifre denemesinde
     * kilide kalan deneme hakkı da döner; giriş ekranı bunu butonun altında
     * gösterir. Diğer kimlik hatalarında alan hiç yazılmaz.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(AuthenticationException ex, WebRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.UNAUTHORIZED.value());
        body.put("message", ex.getMessage());
        body.put("path", request.getDescription(false));
        body.put("timestamp", LocalDateTime.now());
        if (ex.getRemainingAttempts() != null) {
            body.put("remainingAttempts", ex.getRemainingAttempts());
        }

        return new ResponseEntity<>(body, HttpStatus.UNAUTHORIZED);
    }

    /**
     * TokenExpiredException için hata işleyici
     */
    @ExceptionHandler(TokenExpiredException.class)
    public ResponseEntity<ErrorResponse> handleTokenExpiredException(TokenExpiredException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    /**
     * AccessDeniedException için hata işleyici
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        // Süper admin panelinde görünecek denetim kaydı: kim/IP/hangi sayfa/hangi uç.
        if (request instanceof ServletWebRequest servletWebRequest) {
            securityEventService.record(servletWebRequest.getRequest(),
                    SecurityEvent.FORBIDDEN, ex.getMessage());
        }

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                "Yetkisiz erişim. Bu kaynağa erişim için gerekli izne sahip değilsiniz.",
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }

    /**
     * Kapatılmış hesapla giriş: istemci geri alma ekranını açabilsin diye
     * kalıcı silinme tarihi ve kalan gün sayısı da döner.
     */
    @ExceptionHandler(AccountClosedException.class)
    public ResponseEntity<Map<String, Object>> handleAccountClosedException(AccountClosedException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "ACCOUNT_CLOSED");
        body.put("status", HttpStatus.LOCKED.value());
        body.put("message", ex.getMessage());
        body.put("deactivatedAt", ex.getDeactivatedAt());
        body.put("deleteAt", ex.getDeleteAt());
        body.put("daysLeft", ex.getDeleteAt() == null
                ? null
                : Math.max(ChronoUnit.DAYS.between(LocalDateTime.now(), ex.getDeleteAt()), 0));

        return new ResponseEntity<>(body, HttpStatus.LOCKED);
    }

    /**
     * Çok fazla hatalı denemeden sonra kilitlenen hesap. Panel kalan süreyi
     * gösterebilsin diye kilidin bitiş anı ve kalan dakika da döner.
     */
    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<Map<String, Object>> handleAccountLockedException(AccountLockedException ex) {
        // Kalıcı kilitte geri sayacak süre yok: tek çıkış yolu şifre sıfırlamadır.
        if (ex.isUntilPasswordReset()) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("code", "ACCOUNT_LOCKED_UNTIL_RESET");
            body.put("status", HttpStatus.LOCKED.value());
            body.put("message", ex.getMessage());
            return new ResponseEntity<>(body, HttpStatus.LOCKED);
        }

        // Kalan süre SUNUCUDA hesaplanır. İstemci lockedUntil'i kendi ayrıştırsaydı
        // (alan saat dilimi taşımıyor) tarayıcısı farklı bir saat diliminde olan
        // kullanıcıda geri sayım saatlerce yanlış çıkardı.
        long secondsLeft = ex.getLockedUntil() == null
                ? 0
                : Math.max(ChronoUnit.SECONDS.between(LocalDateTime.now(), ex.getLockedUntil()), 0);
        long minutesLeft = Math.max((secondsLeft + 59) / 60, 1);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", "ACCOUNT_LOCKED");
        body.put("status", HttpStatus.LOCKED.value());
        body.put("message", ex.getMessage() + " Lütfen " + minutesLeft + " dakika sonra tekrar deneyin.");
        body.put("lockedUntil", ex.getLockedUntil());
        body.put("minutesLeft", minutesLeft);
        body.put("secondsLeft", secondsLeft);

        return new ResponseEntity<>(body, HttpStatus.LOCKED);
    }

    /**
     * İş kuralı ihlali (örn. aktif anketi olan hesabın kapatılmak istenmesi)
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(IllegalStateException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    /**
     * Geçersiz girdi (örn. tanımsız çalışan rolü, boş uyarı sebebi).
     * Kullanıcı hatası 500 değil 400 dönmelidir.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(),
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    /**
     * Zorunlu istek parametresi gönderilmemiş (örn. rapor uçlarında companyId).
     * Aşağıdaki genel Exception işleyicisine düşerse 500 dönüyordu; oysa bu bir
     * istemci hatasıdır.
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(
            MissingServletRequestParameterException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Zorunlu parametre eksik: " + ex.getParameterName(),
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    /**
     * MethodArgumentNotValidException için hata işleyici
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, List<String>> errors = new HashMap<>();

        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();

            errors.computeIfAbsent(fieldName, k -> new ArrayList<>()).add(errorMessage);
        });

        ValidationErrorResponse validationErrorResponse = new ValidationErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Validation Failed",
                errors,
                LocalDateTime.now()
        );

        return new ResponseEntity<>(validationErrorResponse, HttpStatus.BAD_REQUEST);
    }

    /**
     * Olmayan adres / desteklenmeyen HTTP metodu. Genel işleyiciye düşerse
     * istemci "sunucu hatası" görüyor, var olmayan uç ile bozuk uç birbirinden
     * ayırt edilemiyordu.
     */
    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(Exception ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "İstenen adres bulunamadı",
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.METHOD_NOT_ALLOWED.value(),
                "Bu adres için geçersiz istek yöntemi",
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.METHOD_NOT_ALLOWED);
    }

    /**
     * Benzersizlik ihlali (şirket adı, e-posta gibi unique index'ler).
     * Aşağıdaki genel işleyiciye düşerse kullanıcı "sunucu hatası" görüp neyin
     * çakıştığını anlayamıyordu.
     */
    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateKey(DuplicateKeyException ex, WebRequest request) {
        log.warn("Benzersizlik ihlali: {}", ex.getMessage());

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "Bu bilgilerle kayıtlı bir kayıt zaten var.",
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    /**
     * Beklenmeyen hatalar. İstemciye SABİT bir mesaj döner; ayrıntı yalnızca
     * sunucu loguna yazılır.
     * <p>
     * Önceden {@code ex.getMessage()} olduğu gibi gönderiliyordu: Mongo sorguları,
     * sınıf adları, alan adları ve iç durum bilgisi dışarıya sızıyor, saldırgana
     * sistemin haritasını çıkarıyordu.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex, WebRequest request) {
        log.error("Beklenmeyen hata: {}", request.getDescription(false), ex);

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "İşlem sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
                request.getDescription(false),
                LocalDateTime.now()
        );

        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Standart hata yanıtı sınıfı
     */
    @Data
    public static class ErrorResponse {
        private int status;
        private String message;
        private String path;
        private LocalDateTime timestamp;

        public ErrorResponse(int status, String message, String path, LocalDateTime timestamp) {
            this.status = status;
            this.message = message;
            this.path = path;
            this.timestamp = timestamp;
        }
    }

    /**
     * Doğrulama hatası yanıtı sınıfı
     */
    @Data
    public static class ValidationErrorResponse {
        private int status;
        private String message;
        private Map<String, List<String>> errors;
        private LocalDateTime timestamp;

        public ValidationErrorResponse(int status, String message, Map<String, List<String>> errors, LocalDateTime timestamp) {
            this.status = status;
            this.message = message;
            this.errors = errors;
            this.timestamp = timestamp;
        }
    }
}
