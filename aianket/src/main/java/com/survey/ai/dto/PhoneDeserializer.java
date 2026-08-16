package com.survey.ai.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;

/**
 * Telefon alanlarını sunucuda normalleştirir; istemcinin biçimlendirmesi
 * doğrulamayı etkilemesin diye doğrulamadan önce çalışır.
 *
 * "507 527 38 31" -> "5075273831", "+90 (507) 527-38-31" -> "+905075273831",
 * "0090..." -> "+90...", "0 507 ..." -> "507 ..." (baştaki 0 düşer).
 */
public class PhoneDeserializer extends JsonDeserializer<String> {

    @Override
    public String deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        String raw = parser.getValueAsString();
        if (raw == null) {
            return null;
        }

        String cleaned = raw.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("00")) {
            cleaned = "+" + cleaned.substring(2);
        }

        // '+' yalnızca en başta anlamlı; arada kalanlar temizlenir.
        boolean international = cleaned.startsWith("+");
        String digits = cleaned.replace("+", "");

        // Ulusal yazımda baştaki 0 (0 507 ... / 0 850 ...) numaranın parçası değildir.
        if (!international && digits.length() == 11 && digits.startsWith("0")) {
            digits = digits.substring(1);
        }

        return international ? "+" + digits : digits;
    }
}
