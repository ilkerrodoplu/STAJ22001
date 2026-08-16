
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAccountLock } from '../../hooks/useAccountLock';
import { homePath } from '../../utils/roles';
import {
    Alert,
    Button,
    TextField,
    Grid,
    Typography,
    Container,
    Paper,
    InputAdornment,
    IconButton,
    CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const Login = () => {
    const navigate = useNavigate();
    const { login, loading } = useAuth();
    const { locked, remaining, rateLimited, untilReset, captureLock, clearLock } = useAccountLock();

    const [formValues, setFormValues] = useState({
        email: '',
        password: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [formSubmitting, setFormSubmitting] = useState(false);
    /** Kilide kalan deneme hakkı; sunucudan gelir (tarayıcı yenilenince sıfırlanmasın). */
    const [remainingAttempts, setRemainingAttempts] = useState(null);

    // Input değişikliklerini takip et
    const handleChange = (e) => {
        const { name, value } = e.target;

        // Kilit uyarısı yazılan hesaba aittir. E-posta değişince kalkmalı;
        // aksi halde bir hesap kilitlenince aynı tarayıcıdan BAŞKA bir hesaba
        // da girilemiyor, form kapalı kalıyordu.
        //
        // İstek sınırı (rateLimited) ise ADRESE aittir: e-posta değiştirmek onu
        // kaldırmaz. Kaldırılsaydı kilitli hesabın e-postasında bir harf değiştiren
        // kişi formu tekrar açıp sınırsız deneme yapıyormuş gibi görürdü.
        if (name === 'email' && value !== formValues.email && !rateLimited) {
            clearLock();
            setRemainingAttempts(null);
        }

        setFormValues({
            ...formValues,
            [name]: value
        });

        // Hata mesajlarını temizle
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: null
            });
        }
    };

    // Form gönderildiğinde
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Form doğrulama
        const newErrors = {};
        if (!formValues.email) {
            newErrors.email = 'E-posta gereklidir';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
            newErrors.email = 'Geçerli bir e-posta adresi girin';
        }

        if (!formValues.password) {
            newErrors.password = 'Şifre gereklidir';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setFormSubmitting(true);

        try {
            console.log('Login attempt for:', formValues.email);

            // AuthContext üzerinden login
            const result = await login(formValues.email, formValues.password);

            // Kalan hak yalnızca hatalı şifre yanıtında döner; kilitte ya da
            // başka bir hatada gösterilecek bir sayı yok, temizlenir.
            setRemainingAttempts(result.data?.remainingAttempts ?? null);

            if (result.success) {
                // Herkes panele değil, rolünün açılış sayfasına gider.
                navigate(homePath(result.user?.roles));
            } else if (captureLock(result)) {
                // Hesap kilitli: kalan süre ekranda sayılır, form kapanır.
                // Denemeye devam etmenin faydası yok, kilit uzamıyor ama
                // kullanıcı boşuna uğraşmasın.
            } else if (result.data?.code === 'ACCOUNT_CLOSED') {
                // Kapatılmış hesap: kalan süre ve geri alma ekranına yönlendir
                navigate('/admin/account-closed', {
                    state: {
                        email: formValues.email,
                        password: formValues.password,
                        deleteAt: result.data.deleteAt,
                        daysLeft: result.data.daysLeft
                    }
                });
            }
        } catch (error) {
            console.error('Login error in component:', error);
        } finally {
            setFormSubmitting(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
                <Typography component="h1" variant="h5" align="center" gutterBottom>
                    Giriş Yap
                </Typography>

                {locked && untilReset && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        Hesabınız çok sayıda hatalı giriş denemesi nedeniyle güvenlik amacıyla
                        kilitlendi ve <strong>kendiliğinden açılmayacak</strong>.
                        <br />
                        E-posta adresinize gönderdiğimiz bağlantıyla şifrenizi sıfırlayarak
                        hesabınızı açabilirsiniz. E-posta gelmediyse{' '}
                        <Link to="/auth/forgot-password">buradan yeni bağlantı isteyin</Link>.
                    </Alert>
                )}

                {locked && !untilReset && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        {rateLimited ? (
                            <>
                                Çok fazla deneme yapıldı. Güvenlik için bir süre beklemeniz
                                gerekiyor. Kalan süre: <strong>{remaining}</strong>
                            </>
                        ) : (
                            <>
                                Çok fazla hatalı giriş denemesi yapıldı, hesabınız geçici olarak
                                kilitlendi. Tekrar denemek için kalan süre:{' '}
                                <strong>{remaining}</strong>
                                {/* Şifre sıfırlama BİLEREK önerilmiyor: geçici kilit
                                    beklenerek geçilir. Sıfırlama yalnızca hesap kalıcı
                                    olarak kilitlendiğinde, e-postayla gelen bağlantıyla
                                    devreye girer. */}
                            </>
                        )}
                    </Alert>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="E-posta Adresi"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={formValues.email}
                        onChange={handleChange}
                        error={!!errors.email}
                        helperText={errors.email}
                        disabled={formSubmitting || loading}
                    />

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Şifre"
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        autoComplete="current-password"
                        value={formValues.password}
                        onChange={handleChange}
                        error={!!errors.password}
                        helperText={errors.password}
                        disabled={formSubmitting || loading}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }
                        }}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={formSubmitting || loading || locked}
                    >
                        {(formSubmitting || loading) ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            'Giriş Yap'
                        )}
                    </Button>

                    {remainingAttempts != null && !locked && (
                        <Typography variant="body2" color="error" align="center">
                            Kalan deneme hakkınız: <strong>{remainingAttempts}</strong>
                        </Typography>
                    )}

                    <Grid container justifyContent="space-between" spacing={2} sx={{ mt: 1 }}>
                        <Grid item>
                            <Link to="/auth/forgot-password" style={{ textDecoration: 'none' }}>
                                <Typography variant="body2" color="primary">
                                    Şifremi Unuttum
                                </Typography>
                            </Link>
                        </Grid>
                        <Grid item>
                            <Link to="/auth/register" style={{ textDecoration: 'none' }}>
                                <Typography variant="body2" color="primary">
                                    Hesabınız yok mu? Kayıt olun
                                </Typography>
                            </Link>
                        </Grid>
                    </Grid>
                </form>
            </Paper>
        </Container>
    );
};

export default Login;
