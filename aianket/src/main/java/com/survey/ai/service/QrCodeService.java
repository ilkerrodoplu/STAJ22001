package com.survey.ai.service;


import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.survey.ai.util.UrlEncoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class QrCodeService {

    @Autowired
    private UrlEncoder urlEncoder;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    /**
     * Anket için QR kod URL'i oluşturur
     */
    public String generateSurveyUrl(String companyId, String surveyId) {
        String encodedData = urlEncoder.encodeIds(companyId, surveyId);
        return frontendUrl + "/survey/" + encodedData;
    }

    /**
     * QR kodu oluşturur ve base64 formatında döndürür
     */
    public Map<String, String> generateQrCode(String companyId, String surveyId) throws WriterException, IOException {
        String surveyUrl = generateSurveyUrl(companyId, surveyId);
        String encodedData = urlEncoder.encodeIds(companyId, surveyId);

        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(surveyUrl, BarcodeFormat.QR_CODE, 250, 250);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

        String qrCodeBase64 = Base64.getEncoder().encodeToString(outputStream.toByteArray());

        Map<String, String> result = new HashMap<>();
        result.put("qrCodeBase64", "data:image/png;base64," + qrCodeBase64);
        result.put("surveyUrl", surveyUrl);
        result.put("encodedData", encodedData);

        return result;
    }
}

