import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from 'axios';
import {
    Button,
    TextField,
    Typography,
    Container,
    Paper,
    CircularProgress,
    Box,
    Alert,
    AlertTitle,
    Snackbar
} from '@mui/material';
// Bkz. Register.js: MUI 7'de "<Grid item xs>" yok sayılıyor, GridLegacy eski davranışı korur.
import Grid from '@mui/material/GridLegacy';
import CountryPhoneInput from '../../components/CountryPhoneInput';
import { defaultCountry } from '../../data/countries';
import { isValidPhoneNumber } from 'libphonenumber-js';

const API_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const TR_PHONE_REGEX = /^(?:[234]\d{9}|5\d{9}|850\d{7}|444\d{4})$/;

const normalizePhone = (dialCode, phone) => `+${dialCode}${(phone || '').replace(/\s+/g, '')}`;
const isValidPhoneForCountry = (phone, country) =>
    country.iso2 === 'TR'
        ? TR_PHONE_REGEX.test((phone || '').replace(/\s+/g, ''))
        : isValidPhoneNumber(normalizePhone(country.dialCode, phone));

// Kayıt kodu şirket sahibinin panelinden alınır: 8 karakter, karışan harfler yok.
const INVITE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{8}$/;

const BACKEND_FIELD_MAP = {
    'user.firstName': 'firstName',
    'user.lastName': 'lastName',
    'user.email': 'email',
    'user.phone': 'phone',
    'user.password': 'password',
    'user.passwordConfirm': 'passwordConfirm',
    'inviteCode': 'inviteCode'
};

const validate = (form, country) => {
    const errors = {};
    if (!form.firstName) errors.firstName = 'Ad zorunludur';
    if (!form.lastName) errors.lastName = 'Soyad zorunludur';
    if (!form.email) errors.email = 'E-posta zorunludur';
    else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Geçerli bir e-posta adresi giriniz';
    if (!form.phone) errors.phone = 'Telefon zorunludur';
    else if (!isValidPhoneForCountry(form.phone, country)) errors.phone = 'Geçerli bir telefon numarası giriniz';
    if (!form.password) errors.password = 'Şifre zorunludur';
    else if (form.password.length < 8) errors.password = 'Şifre en az 8 karakter olmalıdır';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
        errors.password = 'Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir';
    if (form.passwordConfirm !== form.password) errors.passwordConfirm = 'Şifreler eşleşmiyor';
    // Kod isteğe bağlı: boş bırakılırsa hesap şirketsiz açılır, kullanıcı sonradan
    // katılır. Girildiyse biçimi doğru olmalı, yoksa kayıt boşuna reddedilir.
    if (form.inviteCode && !INVITE_CODE_REGEX.test(form.inviteCode.toUpperCase()))
        errors.inviteCode = 'Kayıt kodu 8 karakterdir, şirket sahibinizden alabilirsiniz';
    return errors;
};

/**
 * Çalışan kaydı: şirket bilgisi istenmez. Çalışan, şirket sahibinin panelinden
 * paylaştığı kayıt kodunu girerek şirkete bağlanır.
 */
export default function RegisterEmployee({ onBack }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [country, setCountry] = useState(defaultCountry);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [alertOpen, setAlertOpen] = useState(false);
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        passwordConfirm: '',
        inviteCode: ''
    });

    const handleChange = (field) => (e) => {
        const value = field === 'inviteCode' ? e.target.value.toUpperCase() : e.target.value;
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate(form, country);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setAlertOpen(true);
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post(`${API_URL}/auth/register/employee`, {
                user: {
                    firstName: form.firstName,
                    lastName: form.lastName,
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    passwordConfirm: form.passwordConfirm,
                    phone: normalizePhone(country.dialCode, form.phone)
                },
                // Boş string gönderilmez; "kod yok" demek null'dır.
                inviteCode: form.inviteCode.trim() ? form.inviteCode.trim().toUpperCase() : null
            });

            setErrors({});
            setSuccessMessage(response.data.message || 'Kaydınız tamamlandı');
            setAlertOpen(true);
            setTimeout(() => navigate('/admin/login'), 1500);
        } catch (err) {
            const backendErrors = err.response?.data?.errors;
            if (backendErrors && typeof backendErrors === 'object') {
                const mapped = {};
                Object.entries(backendErrors).forEach(([key, value]) => {
                    const message = Array.isArray(value) ? value.join(' ') : value;
                    mapped[BACKEND_FIELD_MAP[key] || key] = message;
                });
                setErrors(mapped);
            } else {
                setErrors({
                    submit: err.response?.data?.message
                        || 'Kayıt tamamlanamadı. Kayıt kodunu şirket sahibinizle doğrulayın.'
                });
            }
            setAlertOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const errorMessages = Object.values(errors).filter(Boolean);

    return (
        <Container component="main" maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
                <Typography component="h1" variant="h5" align="center" gutterBottom>
                    Çalışan Hesabı
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
                    Şirketinizin kayıt kodu varsa girin; kaydınız şirket sahibinin onayına düşer ve
                    onaylanana kadar yalnızca profil ve ayarlar sayfalarını görürsünüz. Kodunuz yoksa
                    kod alanını boş bırakabilir, şirket seçimini sonraya bırakabilirsiniz.
                </Typography>

                <Snackbar
                    open={alertOpen && (Boolean(successMessage) || errorMessages.length > 0)}
                    autoHideDuration={6000}
                    onClose={(_, reason) => { if (reason !== 'clickaway') setAlertOpen(false); }}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert
                        severity={successMessage ? 'success' : 'error'}
                        onClose={() => setAlertOpen(false)}
                        sx={{ width: '100%', maxWidth: 400 }}
                    >
                        {successMessage ? successMessage : errorMessages.length === 1 ? errorMessages[0] : (
                            <>
                                <AlertTitle>Lütfen aşağıdaki hataları düzeltin</AlertTitle>
                                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                                    {errorMessages.map((message, index) => <li key={index}>{message}</li>)}
                                </Box>
                            </>
                        )}
                    </Alert>
                </Snackbar>

                <form onSubmit={handleSubmit} noValidate style={{ width: '100%' }}>
                    <Grid container spacing={2.5}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Şirket Kayıt Kodu (isteğe bağlı)"
                                placeholder="ÖRN: K7M2QX9P"
                                value={form.inviteCode}
                                onChange={handleChange('inviteCode')}
                                error={!!errors.inviteCode}
                                helperText={errors.inviteCode
                                    || 'Kodunuz yoksa boş bırakın: hesabınız açılır, sonradan şirkete katılabilir ya da kendi şirketinizi kurabilirsiniz.'}
                                inputProps={{ maxLength: 8, style: { letterSpacing: '0.3em', textTransform: 'uppercase' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField required fullWidth label="Ad"
                                       value={form.firstName} onChange={handleChange('firstName')}
                                       error={!!errors.firstName} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField required fullWidth label="Soyad"
                                       value={form.lastName} onChange={handleChange('lastName')}
                                       error={!!errors.lastName} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField required fullWidth label="E-posta" type="email"
                                       value={form.email} onChange={handleChange('email')}
                                       error={!!errors.email} />
                        </Grid>
                        <Grid item xs={12}>
                            <CountryPhoneInput
                                label="Telefon"
                                required
                                value={form.phone}
                                onValueChange={(value) => setForm(prev => ({ ...prev, phone: value }))}
                                country={country}
                                onCountryChange={setCountry}
                                error={!!errors.phone}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField required fullWidth label="Şifre" type="password"
                                       value={form.password} onChange={handleChange('password')}
                                       error={!!errors.password} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField required fullWidth label="Şifre Tekrar" type="password"
                                       value={form.passwordConfirm} onChange={handleChange('passwordConfirm')}
                                       error={!!errors.passwordConfirm} />
                        </Grid>
                        <Grid item xs={6}>
                            <Button fullWidth variant="outlined" onClick={onBack}>Geri</Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button fullWidth type="submit" variant="contained" color="primary" disabled={loading}>
                                {loading ? <CircularProgress size={24} /> : 'Kaydı Tamamla'}
                            </Button>
                        </Grid>
                    </Grid>
                </form>

                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                        Zaten hesabınız var mı?{' '}
                        <Link to="/admin/login" style={{ color: '#1976d2', textDecoration: 'none' }}>
                            Giriş yapın
                        </Link>
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}
