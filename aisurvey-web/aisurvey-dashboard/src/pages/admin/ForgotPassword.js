import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [sent, setSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Geçerli bir e-posta adresi girin');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            await axios.post(`${API_URL}/auth/forgot-password`, null, { params: { email } });
            // Adres kayıtlı olmasa da aynı mesaj gösterilir; kimin kayıtlı
            // olduğu buradan öğrenilmemeli.
            setSent(true);
        } catch (err) {
            setError('İstek gönderilemedi, lütfen daha sonra tekrar deneyin');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
                <Typography component="h1" variant="h5" align="center" gutterBottom>
                    Şifremi Unuttum
                </Typography>

                {sent ? (
                    <>
                        <Alert severity="success" sx={{ mt: 2 }}>
                            Adres kayıtlıysa şifre sıfırlama bağlantısı e-postanıza gönderildi.
                            Bağlantı 24 saat geçerlidir.
                        </Alert>
                        <Button component={Link} to="/admin/login" fullWidth sx={{ mt: 3 }}>
                            Giriş ekranına dön
                        </Button>
                    </>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <Typography variant="body2" color="text.secondary">
                            Hesabınızın e-posta adresini girin, sıfırlama bağlantısını gönderelim.
                        </Typography>

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="E-posta Adresi"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(null); }}
                            error={!!error}
                            helperText={error}
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
                            {submitting ? <CircularProgress size={24} color="inherit" /> : 'Bağlantıyı Gönder'}
                        </Button>

                        <Button component={Link} to="/admin/login" fullWidth>
                            Giriş ekranına dön
                        </Button>
                    </form>
                )}
            </Paper>
        </Container>
    );
};

export default ForgotPassword;
