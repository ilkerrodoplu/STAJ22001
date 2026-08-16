import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
    Alert,
    Button,
    CircularProgress,
    Container,
    Paper,
    TextField,
    Typography
} from '@mui/material';

const API_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

// Backend'deki PasswordRules ile aynı: en az 8 karakter, küçük harf, büyük
// harf, rakam. Kayıt ekranıyla da aynı kural; özel karakter serbest.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,100}$/;

const ResetPassword = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get('token');

    const [values, setValues] = useState({ newPassword: '', confirm: '' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues({ ...values, [name]: value });
        setErrors({ ...errors, [name]: null });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!PASSWORD_RULE.test(values.newPassword)) {
            newErrors.newPassword = 'En az 8 karakter; küçük harf, büyük harf ve rakam içermeli';
        }
        if (values.newPassword !== values.confirm) {
            newErrors.confirm = 'Şifreler eşleşmiyor';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/auth/reset-password`, {
                token,
                newPassword: values.newPassword
            });
            navigate('/admin/login', { replace: true });
        } catch (err) {
            // Backend: bilinmeyen token 404, süresi dolmuş token 401 döner.
            setError([404, 401].includes(err.response?.status)
                ? 'Bağlantı geçersiz ya da süresi dolmuş. Yeniden şifre sıfırlama isteyin.'
                : 'Şifre güncellenemedi, lütfen tekrar deneyin');
        } finally {
            setSubmitting(false);
        }
    };

    if (!token) {
        return (
            <Container component="main" maxWidth="xs">
                <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
                    <Alert severity="error">
                        Sıfırlama bağlantısı eksik ya da bozuk. E-postadaki bağlantıyı yeniden açın.
                    </Alert>
                    <Button component={Link} to="/auth/forgot-password" fullWidth sx={{ mt: 3 }}>
                        Yeni bağlantı iste
                    </Button>
                </Paper>
            </Container>
        );
    }

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
                <Typography component="h1" variant="h5" align="center" gutterBottom>
                    Yeni Şifre Belirle
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <form onSubmit={handleSubmit} noValidate>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="newPassword"
                        label="Yeni Şifre"
                        type="password"
                        autoComplete="new-password"
                        autoFocus
                        value={values.newPassword}
                        onChange={handleChange}
                        error={!!errors.newPassword}
                        helperText={errors.newPassword}
                        disabled={submitting}
                    />

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirm"
                        label="Yeni Şifre (Tekrar)"
                        type="password"
                        autoComplete="new-password"
                        value={values.confirm}
                        onChange={handleChange}
                        error={!!errors.confirm}
                        helperText={errors.confirm}
                        disabled={submitting}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={submitting}
                    >
                        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Şifreyi Güncelle'}
                    </Button>

                    <Button component={Link} to="/admin/login" fullWidth>
                        Giriş ekranına dön
                    </Button>
                </form>
            </Paper>
        </Container>
    );
};

export default ResetPassword;
