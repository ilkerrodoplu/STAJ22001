/**
 * Kullanıcının görünen adı. Backend'de name = ad, lastName = soyad olarak
 * ayrı durur; ekranda birleştirmek isteyen her yer buradan geçer.
 */
export const fullName = (user, fallback = 'Kullanıcı') =>
    [user?.name, user?.lastName].filter(Boolean).join(' ') || fallback;
