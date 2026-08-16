# Konum: ~/projects/aisurvey-web/aisurvey-dashboard/Dockerfile

# -----------------
# 1. AŞAMA: BUILD (Uygulamayı Derleme)
# -----------------
# Node.js'in hafif bir versiyonunu (alpine) temel alarak bir "build ortamı" başlat.
# Bu aşama, sadece React kodunu build etmek için kullanılır ve sonuç imajda yer almaz.
# İmaj, "18-alpine" gibi hareketli (mutable) bir etiket yerine sabit bir digest'e
# pinlenmiştir; böylece bu Dockerfile ne zaman, nerede build edilirse edilsin
# her zaman bit-bit aynı temel imaj kullanılır.
FROM node:18-alpine@sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e AS build

# Container içinde çalışacağımız dizini belirle.
WORKDIR /app

# Önce sadece package.json dosyalarını kopyala.
# Bu Docker'ın önbellekleme (caching) mekanizmasını optimize eder.
# Bağımlılıklar değişmediyse, "npm install" adımı tekrar çalıştırılmaz.
COPY package.json ./
COPY package-lock.json ./

# Proje bağımlılıklarını kur.
# "npm install" yerine "npm ci" kullanılır: package-lock.json'daki sürümleri
# birebir kurar, lock dosyasını asla değiştirmez ve package.json ile lock
# dosyası uyuşmuyorsa hata verir. Bu da her build'de aynı bağımlılık
# ağacının kurulmasını garanti eder.
RUN npm ci

# Geri kalan tüm proje dosyalarını kopyala.
COPY . .

# React uygulamasını production (canlı ortam) için build et.
# Bu komut, /app/build adında bir klasör oluşturur.
RUN npm run build

# -----------------
# 2. AŞAMA: SERVE (Uygulamayı Sunma)
# -----------------
# Sonuç imajımız, çok hafif bir Nginx web sunucusu olacak.
# Aynı sebeple bu temel imaj da sabit bir digest'e pinlenmiştir.
FROM nginx:stable-alpine@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46

# Bir önceki "build" aşamasında oluşturulan /app/build klasörünün içindeki
# statik dosyaları, Nginx'in web dosyalarını sunduğu standart klasöre kopyala.
COPY --from=build /app/build /usr/share/nginx/html

# Bu satır en önemlilerinden biri: React Router gibi client-side yönlendirmelerin
# çalışması için, Nginx'e gelen ve bir dosyaya karşılık gelmeyen tüm istekleri
# ana index.html dosyasına yönlendirmesini söylemeliyiz.
# Bunu yapmak için kendi Nginx konfigürasyon dosyamızı oluşturup kopyalayabiliriz.
# Önce varsayılanı silelim.
RUN rm /etc/nginx/conf.d/default.conf

# Bu ayar aisurvey-dashboard/nginx.conf dosyasında tanımlı.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Container'ın dış dünyaya 80 portundan hizmet vereceğini belirt.
EXPOSE 80

# Container çalıştığında Nginx servisini başlat.
CMD ["nginx", "-g", "daemon off;"]
