package com.survey.ai.service;

import com.survey.ai.entity.SurveyQuestion;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.repository.*;
import com.survey.ai.repository.SurveyResponseRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class SurveyDataGenerator {

    @Autowired
    private SurveyResponseRepository surveyResponseRepository;

    private final KafkaTemplate<String, SurveyResponse> kafkaTemplate;


    // İsimler  
    private final List<String> names = Arrays.asList(
            "Ahmet", "Mehmet", "Ayşe", "Fatma", "Zeynep", "Ali", "Veli", "Hasan",
            "Hüseyin", "Mustafa", "Elif", "Sevgi", "Deniz", "Yusuf", "Kemal", "Murat",
            "Selin", "Canan", "Emir", "İbrahim", "Gül", "Merve", "Burak", "Sibel",
            "Cem", "Pınar", "Okan", "Özge", "Serkan", "Derya", "Mustafa"
    );

    // Yorumlar  
    private final List<String> comments = Arrays.asList(
            "Yemekler muhteşemdi, teşekkürler!",
            "Servis biraz yavaştı ama yemekler lezzetliydi",
            "Fiyat/performans açısından başarılı",
            "Dekor çok güzel ama yemekler ortalama",
            "Kesinlikle tekrar geleceğim",
            "Çalışanlar çok ilgiliydi",
            "Menü çeşitliliği artırılabilir",
            "Atmosfer harika, yemekler iyi",
            "Tavsiye üzerine geldim, memnun kaldım",
            "Temizlik konusunda daha dikkatli olunabilir",
            "Porsiyonlar küçük, fiyatlar yüksek",
            "Rezervasyon sistemi mükemmel işliyor",
            "Çocuk menüsü daha zengin olabilir",
            "Gürültü seviyesi biraz yüksekti",
            "Vejetaryen seçenekleri çok kısıtlı",
            "Şefin özel menüsü harika",
            "İçecek çeşitliliği artırılabilir",
            "Tatlılar muhteşemdi",
            "Otopark sorunu yaşadık",
            "Servis personeli daha eğitimli olabilir",
            // Olumlu Yorumlar
            "Yemekler muhteşemdi, teşekkürler!",
            "Fiyat/performans açısından başarılı.",
            "Dekorasyon çok güzel, ortam ferah.",
            "Kesinlikle tekrar geleceğim!",
            "Çalışanlar çok güler yüzlüydü.",
            "Atmosfer harika, yemekler çok lezzetliydi.",
            "Tavsiye üzerine geldim, gerçekten memnun kaldım.",
            "Rezervasyon sistemi harika işliyor.",
            "Menüde özel vegan seçenekler olması çok hoşuma gitti.",
            "Tatlılar enfesti, ellerinize sağlık.",
            "Sunumlar göze de hitap ediyor.",
            "Siparişimiz hızlı geldi, beklemedik.",
            "Bol kepçe ikramlarınız çok hoşuma gitti.",
            "Her zamanki gibi çok keyifli bir akşamdı.",
            "Mekan çok temiz ve hijyenikti.",
            "Şefin özel yemeği harikaydı.",
            "Çocuklar için oyun alanı olması güzel düşünülmüş.",
            "Fiyatlar uygun, porsiyonlar doyurucu.",
            "Mezeler harikaydı, tekrar geleceğim.",
            "Manzara eşliğinde yemek yemek çok keyifliydi.",
            "Herkese tavsiye ederim.",
            "İlgili çalışanlar sayesinde güzel bir akşam geçirdik.",
            "Özellikle kahvaltı tabağına bayıldık!",
            "Müzik seçimleri çok hoştu, rahatsızlık vermedi.",
            "İçecekler soğuk ve tazeydi.",
            "Menüde glutensiz seçenek bulmak bizi mutlu etti.",
            "Salatalar taze ve lezizdi.",
            "Paket servis çok hızlı ve sıcak geldi.",
            "Doğum günü kutlamamız için güzel hazırlık yapılmıştı.",
            "Geleneksel yemekleriniz çok lezzetli.",
            "Rezervasyon süreci problemsizdi.",
            "Çalışanlar çok ilgilendi.",
            "Bebek sandalyesi olması çok iyi.",
            "Şık ve sade bir ortam.",
            "Restoranın konumu merkezi ve ulaşımı kolay.",
            "Sunumlar profesyonelce hazırlanmış.",
            "Temizlik kurallarına dikkat edilmektedir.",
            "Çorbalar sıcacık geldi, çok beğendik.",
            "Çalışanlar maske ile servis yaptı, hijyen mükemmel.",
            "Alkolsüz içecek seçenekleri genişti.",
            "Menü çeşitliliği gayet yeterli.",
            "Yemeklerin sunumu çok güzeldi.",
            "Bahçesi çok keyifli ve ferah.",
            "Yaza uygun açık alan çok güzel düşünülmüş.",
            "Fırından çıkan ekmek çok tazeydi.",
            "Tatlı menüsü zengin ve çeşitliydi.",
            "Porsiyonlar beklediğimden büyüktü.",
            "Garsonlar çocuklarla çok ilgilendi.",
            "Hafta sonu ailecek geleceğimiz bir mekan bulduk.",
            "Fiyatlar bölgeye göre gayet makul.",
            "Çay ve kahve sunumu çok zarifti.",
            // Olumsuz Yorumlar
            "Servis biraz yavaştı, daha hızlı olmalıydı.",
            "Dekor çok güzel ama yemekler ortalamaydı.",
            "Temizlik konusunda daha dikkatli olunabilir.",
            "Porsiyonlar küçük, fiyatlar yüksek.",
            "Gürültü seviyesi biraz yüksekti.",
            "Vejetaryen seçenekleri çok kısıtlı.",
            "Otopark sorunu yaşadık.",
            "Servis personeli daha eğitimli olabilir.",
            "Menü çeşitliliği artırılabilir.",
            "Fiyatlar beklentimizin üzerindeydi.",
            "Yemeklerde tuz oranı fazlaydı.",
            "Siparişimiz yanlış geldi.",
            "Çorbanın içi çok sıcaktı, içemedik.",
            "Masalar çok sıkışık ve rahat değil.",
            "Rezervasyon yaptığımız halde bekledik.",
            "Menüde belirtilen tatlılar yoktu.",
            "Havalandırma yetersizdi, içerisi sıcaktı.",
            "Salatalar bayat geldi.",
            "Patatesler soğuk ve yağlıydı.",
            "Masamıza ilgisiz davranıldı.",
            "Ürün görselleriyle gerçek servis farklıydı.",
            "İçecekler geç geldi.",
            "Paket servis gecikti ve yemek soğuktu.",
            "Tatlılar çok şekerli ve ağırdı.",
            "Bebek sandalyesi eksikti.",
            "Ortamdaki müzik çok yüksek ve rahatsız ediciydi.",
            "Fiyatlar bu lezzete göre pahalı.",
            "Balık taze değildi.",
            "Garsonlardan biri aksi davrandı.",
            "Çatal ve bıçaklar tam temizlenmemişti.",
            "Menü fiyatları güncellenmemiş, ödeme sürpriz oldu.",
            "Et istediğimiz kıvamda pişmemişti.",
            "Sandalyeler rahatsızdı.",
            "Rezervasyonun iptal edildiği söylenmedi.",
            "Menüde alerjen bilgisinin olmaması eksik.",
            "Mezede yeterince çeşit yok.",
            "Çay bayattı.",
            "Tatlılarımız unutuldu, tekrar istedik.",
            "Kredi kartı cihazı arızalıydı.",
            "Çalışanlar maske takmıyordu.",
            "Siparişte eksiklik vardı.",
            "Oyun alanı hijyenik değildi.",
            "Ekstra ekmek istediğimizde getirilmedi.",
            "Bahşiş zorunlu gibiydi, hoş olmadı.",
            "Telefonla ulaşmak zor.",
            "Kış bahçesi serindi, ısıtıcı yoktu.",
            "Vale hizmeti ücretli olmalı.",
            "Faturalandırma karışıklığı yaşandı.",
            "Çıkarken kimse uğurlamadı."
    );
    @Autowired
    private SurveyTemplateRepository surveyTemplateRepository;

    /**
     * Belirtilen sayıda rastgele SurveyResponse kaydı oluşturup veritabanına ekler
     *
     * @param count Eklenecek kayıt sayısı
     * @return Eklenen kayıt sayısı
     */
    public int generateRandomSurveyResponses(int count,String companyId,String surveyTemplateId) {

       // surveyResponseRepository.deleteAll();
        List<SurveyResponse> responses = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            SurveyResponse response = createRandomSurveyResponse(companyId,surveyTemplateId);
            responses.add(response);
        }

        // Tüm kayıtları veritabanına ekleme  
        surveyResponseRepository.saveAll(responses);

        for (SurveyResponse surveyResponse : responses) {
            if (surveyResponse.getComment() != null && !surveyResponse.getComment().isBlank()) {
                kafkaTemplate.send("customer-comments", surveyResponse);
            }

        }

        return responses.size();
    }

    /**
     * Tek bir rastgele SurveyResponse nesnesi oluşturur
     *
     * @return Rastgele oluşturulmuş SurveyResponse
     */
    private SurveyResponse createRandomSurveyResponse(String companyId,String surveyTemplateId) {
        String randomName = names.get(new Random().nextInt(names.size()));
        String randomComment = comments.get(new Random().nextInt(comments.size()));

        // Rastgele bir tarih oluştur (2024 Ocak - Aralık arası)  
        LocalDateTime randomDate = getRandomDateIn2024();

        // Rastgele bir ObjectId oluştur  
        String id = generateObjectId();

        // E-posta oluştur  
        String email = randomName.toLowerCase() + new Random().nextInt(100) + "@example.com";

        // Kullanıcı ID'si  
        String userId = "user_" + (100 + new Random().nextInt(900));

        // Anket yanıtlarını oluştur  
        Map<String, Integer> surveyResponseMap = new HashMap<>();
      //SurveyTemplate surveyTemplate =  surveyTemplateRepository.findSurveyTemplateByName("Müşteri Memnuniyet Anketi");
        SurveyTemplate surveyTemplate =  surveyTemplateRepository.findByCompanyIdAndId(companyId,surveyTemplateId);
        // SurveyResponse nesnesini oluştur
        SurveyResponse response = new SurveyResponse();
       if (surveyTemplate != null) {
           for (SurveyQuestion surveyQuestion : surveyTemplate.getQuestions()) {
               surveyResponseMap.put(surveyQuestion.getText(), 2 + new Random().nextInt(3)); // 3-5 arası puanlar
           }

           response.setComment(randomComment);
        response.setEmail(email);
        response.setName(randomName);
        response.setRatings(surveyResponseMap);
        response.setCompanyId(surveyTemplate.getCompanyId() == null ? "" : surveyTemplate.getCompanyId() );
        response.setSubmissionDate(randomDate);
        response.setSurveyTemplateId(surveyTemplate.getId());
       }
        return response;
    }

    /**
     * 2024 yılı içinde rastgele bir tarih oluşturur
     */
    private LocalDateTime getRandomDateIn2024() {
        LocalDateTime start = LocalDateTime.of(2024, 8, 24, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2025, 8, 25, 23, 59, 59);

        long startEpochSecond = start.toEpochSecond(ZoneOffset.UTC);
        long endEpochSecond = end.toEpochSecond(ZoneOffset.UTC);
        long randomEpochSecond = ThreadLocalRandom.current().nextLong(startEpochSecond, endEpochSecond);

        return LocalDateTime.ofEpochSecond(randomEpochSecond, 0, ZoneOffset.UTC);
    }

    /**
     * MongoDB ObjectId formatında rastgele bir ID oluşturur
     */
    private String generateObjectId() {
        // 24 karakterlik hexadecimal bir ID oluştur  
        return UUID.randomUUID().toString().replace("-", "").substring(0, 24);
    }
}  