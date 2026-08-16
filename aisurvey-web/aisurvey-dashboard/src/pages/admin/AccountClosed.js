import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAccountLock } from '../../hooks/useAccountLock';
import {
    Button,
    Container,
    Paper,
    TextField,
    Typography,
    Alert,
    CircularProgress
} from '@mui/material';

const formatDate = (value) => {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    } catch (e) {
        return '-';
    }
};

/**
 * Kapatılmış hesapla giriş denenince açılır: kalıcı silinmeye kalan süreyi
 * gösterir ve hesabı geri alma imkanı sunar.
 */
export default function AccountClosed() {
    const navigate = useNavigate();
    const location = useLocation();
    const { reactivate, loading } = useAuth();
    const { locked, remaining, rateLimited, untilReset, captureLock } = useAccountLock();

    // Giriş ekranından gelen bilgiler; sayfa doğrudan açılırsa kullanıcı yeniden girer.
    const { email: stateEmail, password: statePassword, deleteAt, daysLeft } = location.state || {};

    const [email, setEmail] = useState(stateEmail || '');
    const [password, setPassword] = useState(statePassword || '');

    const handleReactivate = async () => {
        const result = await reactivate(email, password);
        if (result.success) {
            navigate('/admin/dashboard');
            return;
        }
        // Hesap geri alma da şifre doğruladığı için kilit bu uçta da işler.
        captureLock(result);
    };

    return (
        <Container component="main" maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
                <Typography component="h1" variant="h5" align="center" gutterBottom>
                    Hesabınız Kapatıldı
                </Typography>

                <Alert severity="warning" sx={{ mt: 2 }}>
                    {daysLeft !== null && daysLeft !== undefined ? (
                        <>
                            Hesabınızın kalıcı olarak silinmesine <strong>{daysLeft} gün</strong> kaldı
                            {deleteAt && <> (silinme tarihi: <strong>{formatDate(deleteAt)}</strong>)</>}.
                            Bu süre dolmadan hesabınızı geri alabilirsiniz.
                        </>
                    ) : (
                        <>Hesabınız pasif durumda. Kalıcı olarak silinmeden önce geri alabilirsiniz.</>
                    )}
                </Alert>

                {locked && untilReset && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        Hesap çok sayıda hatalı giriş denemesi nedeniyle kilitlendi ve
                        <strong> kendiliğinden açılmayacak</strong>. E-posta adresinize
                        gönderilen bağlantıyla şifrenizi sıfırlayın; e-posta gelmediyse{' '}
                        <Link to="/auth/forgot-password">buradan yeni bağlantı isteyin</Link>.
                    </Alert>
                )}

                {locked && !untilReset && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {rateLimited ? (
                            <>
                                Çok fazla deneme yapıldı. Güvenlik için bir süre beklemeniz
                                gerekiyor. Kalan süre: <strong>{remaining}</strong>
                            </>
                        ) : (
                            <>
                                Çok fazla hatalı şifre denemesi yapıldı, hesap geçici olarak
                                kilitlendi. Tekrar denemek için kalan süre: <strong>{remaining}</strong>
                            </>
                        )}
                    </Alert>
                )}

                <Typography variant="body2" color="textSecondary" sx={{ mt: 3 }}>
                    Hesabınızı geri almak için e-posta ve şifrenizi doğrulayın.
                </Typography>

                <TextField
                    margin="normal"
                    fullWidth
                    label="E-posta Adresi"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || locked}
                />

                <TextField
                    margin="normal"
                    fullWidth
                    label="Şifre"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || locked}
                />

                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    sx={{ mt: 3 }}
                    onClick={handleReactivate}
                    disabled={loading || locked || !email || !password}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Hesabımı Geri Al'}
                </Button>

                <Link to="/admin/login" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" color="primary" align="center" sx={{ mt: 2 }}>
                        Giriş ekranına dön
                    </Typography>
                </Link>
            </Paper>
        </Container>
    );
}
