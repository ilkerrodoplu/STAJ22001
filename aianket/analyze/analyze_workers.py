# sentiment_analyzer.py
from kafka import KafkaConsumer, KafkaProducer
from transformers import pipeline
from langdetect import detect
import json
import logging
from datetime import datetime
import warnings
import torch
import os

warnings.filterwarnings("ignore", category=UserWarning)
logging.basicConfig(level=logging.INFO)

# Docker environment variable'dan Kafka adresini al
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092').split(',')
COMMENT_TOPIC = 'customer-comments'
RESULT_TOPIC = 'sentiment-results'

# CPU kullan (Docker'da GPU karmaşık)
device = "cpu"
logging.info(f"Device: {device}")



MODEL_PATH = "/app/model/sentiment_model"

def load_model():
    logging.info(f"Model yükleniyor: {MODEL_PATH}")
    return pipeline("sentiment-analysis", model=MODEL_PATH, device=-1)


# Kafka bağlantısını bekle
def wait_for_kafka():
    import time
    max_retries = 30
    for i in range(max_retries):
        try:
            test_consumer = KafkaConsumer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                consumer_timeout_ms=5000
            )
            test_consumer.close()
            logging.info("✅ Kafka hazır!")
            return True
        except Exception as e:
            logging.info(f"⏳ Kafka bekleniyor... ({i+1}/{max_retries})")
            time.sleep(2)
    return False

# Model yükle
sentiment_analyzer = load_model()
if not sentiment_analyzer:
    exit(1)

# Kafka'yı bekle
if not wait_for_kafka():
    logging.error("❌ Kafka'ya bağlanılamadı!")
    exit(1)

# Kafka Consumer/Producer
consumer = KafkaConsumer(
    COMMENT_TOPIC,
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='latest',
    enable_auto_commit=True,
    group_id='sentiment-analyzer-docker',
    consumer_timeout_ms=30000
)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda m: json.dumps(m, ensure_ascii=False).encode('utf-8')
)

def normalize_sentiment_label(label):
    label_upper = label.upper()
    if label_upper in ['POSITIVE', 'POS', 'LABEL_2']:
        return 'positive'
    elif label_upper in ['NEGATIVE', 'NEG', 'LABEL_0']:
        return 'negative'
    elif label_upper in ['NEUTRAL', 'LABEL_1']:
        return 'neutral'
    else:
        return label.lower()

logging.info("🚀 Docker Sentiment Analyzer başlatıldı!")

# Ana döngü
try:
    while True:
        logging.info("📡 Mesaj bekleniyor...")

        msg_pack = consumer.poll(timeout_ms=30000)

        if msg_pack:
            for tp, messages in msg_pack.items():
                for message in messages:
                    try:
                        data = message.value
                        comment = data.get("comment", "")
                        surveyResponseId = data.get("id", "")

                        if not comment:
                            continue

                        # Dil tespiti
                        try:
                            language = detect(comment)
                        except:
                            language = 'unknown'

                        logging.info(f"🌍 İşleniyor: {language} - {comment[:50]}...")

                        # Sentiment analizi
                        sentiment_result = sentiment_analyzer(comment[:512])[0]
                        normalized_sentiment = normalize_sentiment_label(sentiment_result['label'])

                        result_data = {
                            "surveyResponseId": surveyResponseId,
                            "comment": comment,
                            "language": language,
                            "sentiment": normalized_sentiment,
                            "score": round(sentiment_result['score'], 3),
                            "timestamp": datetime.now().isoformat(),
                            "processed_by": "docker_worker"
                        }

                        producer.send(RESULT_TOPIC, result_data)
                        producer.flush()

                        logging.info(f"✅ Sonuç: {normalized_sentiment} ({sentiment_result['score']:.3f})")

                    except Exception as e:
                        logging.error(f"❌ Hata: {str(e)}")

except KeyboardInterrupt:
    logging.info("🛑 Durduruldu")
finally:
    consumer.close()
    producer.close()
