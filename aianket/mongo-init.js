// Veritabanı ilk kez oluşturulurken çalışır (/docker-entrypoint-initdb.d).
// Uygulamanın kullanacağı readWrite kullanıcısını açar.
//
// Kullanıcı adı/şifre koda YAZILMAZ, .env'den gelir: eskiden bu dosyada
// (ve AdminUserInitializer.java içinde) düz metin duruyordu ve git'e giriyordu.
//
// DİKKAT: Bu betik yalnızca veri dizini BOŞKEN çalışır. Mevcut bir veritabanına
// kullanıcı eklemek için README'deki geçiş adımlarına bakın.

const dbName = process.env.MONGO_APP_DB;
const user = process.env.MONGO_APP_USERNAME;
const pwd = process.env.MONGO_APP_PASSWORD;

if (!dbName || !user || !pwd) {
    throw new Error('MONGO_APP_DB / MONGO_APP_USERNAME / MONGO_APP_PASSWORD tanımlı değil (.env)');
}

db = db.getSiblingDB(dbName);

db.createUser({
    user: user,
    pwd: pwd,
    roles: [{ role: 'readWrite', db: dbName }]
});

print('MONGO INIT - uygulama kullanicisi olusturuldu: ' + user + '@' + dbName);
