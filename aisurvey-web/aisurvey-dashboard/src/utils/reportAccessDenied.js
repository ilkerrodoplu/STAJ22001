import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

/**
 * Aynı sayfa yenilendikçe kayıt çoğalmasın: sekme başına sayfa başına tek
 * bildirim. sessionStorage kullanılır, çünkü bellekteki liste sayfa
 * yenilenince sıfırlanıyor ve her F5 yeni bir "yetkisiz erişim" üretiyordu.
 */
const STORAGE_KEY = 'bildirilenYetkisizSayfalar';

/** Yanıtı beklenen sayfalar; aynı denemenin iki kayıt açmasını engeller. */
const pending = new Set();

const alreadyReported = (page) => {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]').includes(page);
    } catch {
        // Depolama kapalıysa (gizli sekme kotası) kayıt atlanmasın.
        return false;
    }
};

/**
 * Yalnızca sunucu kaydı aldıysa işaretlenir. Önceden istek atılmadan önce
 * işaretleniyordu; istek sınıra takıldığında ya da ağ koptuğunda deneme hem
 * kaydedilmiyor hem de "bildirildi" sayılıp bir daha hiç denenmiyordu.
 */
const markReported = (page) => {
    try {
        const reported = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...reported, page]));
    } catch {
        // Depolama yoksa tekilleştirme de yok; kayıt yine de yazıldı.
    }
};

/**
 * Panel bir sayfayı istemci tarafında kapattığında (oturum yok ya da rol
 * yetersiz) backend'e hiçbir istek gitmiyor, dolayısıyla deneme loglara
 * düşmüyordu. Bu çağrı o boşluğu kapatır.
 *
 * Oturumsuz deneme de bildirilir: panel adreslerine oturum açmadan gelen biri
 * tam olarak görülmek istenen şeydir. Token varsa gönderilir, backend kimliği
 * ona göre kaydeder.
 */
export default function reportAccessDenied(page, section) {
    // Yanıt beklenirken gelen ikinci çağrı elenir: StrictMode efektleri iki kez
    // çalıştırdığı için aynı deneme iki kayıt açıyordu.
    if (pending.has(page) || alreadyReported(page)) {
        return;
    }
    pending.add(page);

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');

    axios
        .post(`${API_BASE_URL}/security-events/page-denied`,
            { page, section },
            token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
        .then(() => markReported(page))
        .catch(() => {
            // Denetim kaydı yazılamazsa kullanıcıya ayrıca hata gösterilmez;
            // sayfa işaretlenmediği için sonraki denemede yeniden bildirilir.
        })
        .finally(() => pending.delete(page));
}
