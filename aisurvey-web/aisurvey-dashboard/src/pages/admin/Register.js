import React, { useState, useEffect } from "react";
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
    Step,
    StepLabel,
    Stepper,
    Alert,
    AlertTitle,
    Snackbar,
    MenuItem,
    Checkbox,
    FormControlLabel
} from '@mui/material';
// MUI 7'de Grid'in API'si değişti: "<Grid item xs={12} sm={6}>" yazımı sessizce
// yok sayılıyor ve alanlar metin genişliğine göre büzülüyordu (kayıt formu bu
// yüzden dağınık görünüyordu). GridLegacy eski 12 sütunlu davranışı sürdürür.
// ponytail: uyumluluk katmanı; MUI 8'e çıkarken "size={{ xs: 12, sm: 6 }}" yazımına geçilmeli.
import Grid from '@mui/material/GridLegacy';
import { isValidPhoneNumber } from 'libphonenumber-js';
import CountryPhoneInput from '../../components/CountryPhoneInput';
import { defaultCountry } from '../../data/countries';
import RegisterEmployee from './RegisterEmployee';

// API URL'i environment variable'dan al
const API_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

// Genel e-posta formatı kontrolü: belirli bir sağlayıcıyla (gmail, hotmail vb.)
// sınırlamak yerine, kurumsal/özel alan adlarını da kabul eden standart bir
// e-posta yapısı (yerel-kısım@alan-adı.uzantı) doğrulanır.
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const isValidEmail = (email) => EMAIL_REGEX.test((email || '').trim());

const normalizePhone = (dialCode, phone) => `+${dialCode}${(phone || '').replace(/\s+/g, '')}`;
const normalizeEmail = (email) => (email || '').trim().toLowerCase();

// Türkiye numaraları libphonenumber-js'in genel kurallarından daha katı, resmi
// numaralandırma planına göre kontrol edilir: cep (5XX), sabit hat (2/3/4XX),
// 850'li kurumsal hatlar (10 hane) ve 444'lü çağrı merkezi hatları (7 hane, alan kodsuz).
const TR_PHONE_REGEX = /^(?:[234]\d{9}|5\d{9}|850\d{7}|444\d{4})$/;
const isValidTurkishPhone = (phone) => TR_PHONE_REGEX.test((phone || '').replace(/\s+/g, ''));
const isValidPhoneForCountry = (phone, country) =>
    country.iso2 === 'TR' ? isValidTurkishPhone(phone) : isValidPhoneNumber(normalizePhone(country.dialCode, phone));

// Backend'deki CompanyType enum'ının karşılığı. Liste API'den (GET /company/types)
// çekilir; istek başarısız olursa kayıt formu kilitlenmesin diye burası yedek olarak
// kullanılır. Değerler backend enum adlarıyla birebir aynı olmalıdır.
const FALLBACK_COMPANY_TYPES = [
    { value: 'default', label: 'Seçiniz' },
    { value: 'TECHNOLOGY', label: 'Teknoloji/Yazılım Şirketleri' },
    { value: 'ECOMMERCE_RETAIL', label: 'E-Ticaret & Perakende' },
    { value: 'SERVICE', label: 'Hizmet Sektörü' },
    { value: 'RESTAURANT_CAFE', label: 'Restoran & Kafe' },
    { value: 'OTHER', label: 'Diğer' }
];

const OTHER_COMPANY_TYPE = 'OTHER';

const getCompanyNameError = (name) => (!name ? "Firma adı zorunludur" : '');
const getCompanyWebsiteError = (website) => (!website ? "Web sitesi zorunludur" : '');
const getCompanyTypeError = (type) => (!type || type === 'default' ? "Lütfen şirketi seçiniz" : '');

const getCompanyTypeOtherError = (type, other) => {
    if (type !== OTHER_COMPANY_TYPE) return '';
    if (!other || !other.trim()) return "Lütfen şirket türünüzü yazınız";
    if (other.trim().length > 100) return "Şirket türü en fazla 100 karakter olabilir";
    return '';
};

// Şirket ve yönetici iletişim bilgisinin aynı olması hata değildir: tek kişilik
// firmalarda sahip kendi telefonunu/e-postasını şirket için de kullanır.
// Yalnızca yanlışlıkla yazılmış olma ihtimaline karşı uyarı gösterilir.
const getCompanyPhoneError = (phone, country) => {
    if (!phone) return "Firma telefonu zorunludur";
    if (!isValidPhoneForCountry(phone, country)) return "Geçerli bir telefon numarası giriniz";
    return '';
};

const getCompanyEmailError = (email) => {
    if (!email) return "Firma e-postası zorunludur";
    if (!isValidEmail(email)) return "Geçerli bir firma e-postası giriniz";
    return '';
};

const getFirstNameError = (value) => (!value ? "Ad zorunludur" : '');
const getLastNameError = (value) => (!value ? "Soyad zorunludur" : '');

const getUserEmailError = (email) => {
    if (!email) return "E-posta zorunludur";
    if (!isValidEmail(email)) return "Geçerli bir e-posta adresi giriniz";
    return '';
};

const getUserPhoneError = (phone, country) => {
    if (!phone) return "Telefon zorunludur";
    if (!isValidPhoneForCountry(phone, country)) return "Geçerli bir telefon numarası giriniz";
    return '';
};

const PASSWORD_MIN_LENGTH = 8;

const getPasswordError = (password) => {
    if (!password) return "Şifre zorunludur";
    if (password.length < PASSWORD_MIN_LENGTH) return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`;
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return "Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir";
    return '';
};

const getPasswordConfirmError = (confirm, password) => (confirm !== password ? "Şifreler eşleşmiyor" : '');

// Backend'in döndüğü alan adlarını (örn. "company.name", "user.email")
// formdaki karşılık gelen hata anahtarlarına eşler
const BACKEND_FIELD_MAP = {
    'company.name': 'companyName',
    'company.phone': 'companyPhone',
    'company.email': 'companyEmail',
    'company.website': 'companyWebsite',
    'company.companyType': 'companyType',
    'company.companyTypeOther': 'companyTypeOther',
    'company.companyTypeOtherProvided': 'companyTypeOther',
    'user.firstName': 'firstName',
    'user.lastName': 'lastName',
    'user.email': 'userEmail',
    'user.phone': 'userPhone',
    'user.password': 'password',
    'user.passwordConfirm': 'passwordConfirm'
};

const COMPANY_ONLY_FIELDS = new Set(['name', 'address', 'description', 'website', 'companyName', 'companyPhone', 'companyEmail', 'companyType', 'companyTypeOther']);

/**
 * Kayıt iki hesap türüne ayrılır: şirket sahibi kendi şirketini kurar, çalışan
 * ise şirket sahibinden aldığı kayıt kodu ile mevcut şirkete katılır.
 */
function AccountTypeChoice({ onSelect }) {
    return (
        <Container component="main" maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
                <Typography component="h1" variant="h5" align="center" gutterBottom>
                    Nasıl kayıt olmak istersiniz?
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
                    Şirketinizi siz mi kuruyorsunuz, yoksa mevcut bir şirkete mi katılıyorsunuz?
                </Typography>

                {/* İki seçenek de aynı boyutta: sabit yükseklik, tam genişlik, açıklama yok.
                    Grid kullanılmıyor: bu MUI sürümünde "item xs" yok sayılıyor ve
                    butonlar metin uzunluğu kadar genişleyip farklı boyutta görünüyordu. */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        sx={{ height: 56 }}
                        onClick={() => onSelect('owner')}
                    >
                        Şirket Sahibi
                    </Button>
                    <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        sx={{ height: 56 }}
                        onClick={() => onSelect('employee')}
                    >
                        Şirket Çalışanı
                    </Button>
                </Box>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
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

export default function Register() {
    const navigate = useNavigate();
    const [accountType, setAccountType] = useState(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const companyTypeRef = React.useRef(null);
    const formRef = React.useRef(null);

    const [form, setForm] = useState({
        company: {
            name: "",
            description: "",
            address: "",
            phone: "",
            email: "",
            website: "",
            companyType: "default",
            companyTypeOther: "",
            status: "ACTIVE"
        },
        user: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            passwordConfirm: "",
            phone: ""
        }
    });
    const [errors, setErrors] = useState({});
    const [companyCountry, setCompanyCountry] = useState(defaultCountry);
    const [userCountry, setUserCountry] = useState(defaultCountry);
    const [alertOpen, setAlertOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [companyTypes, setCompanyTypes] = useState(FALLBACK_COMPANY_TYPES);

    useEffect(() => {
        axios.get(`${API_URL}/company/types`)
            .then(res => {
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setCompanyTypes([{ value: 'default', label: 'Seçiniz' }, ...res.data]);
                }
            })
            .catch(() => { /* yedek liste kullanılır */ });
    }, []);

    // Tek bir alanın hata mesajını anlık olarak set eder ya da (geçerliyse) kaldırır.
    const setFieldError = (key, message) => {
        setErrors(prev => {
            if (!message) {
                if (!(key in prev)) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: message };
        });
    };

    const handleChange = (section, field) => (e) => {
        const { value } = e.target;
        setForm(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));

        if (section === 'company' && field === 'name') {
            setFieldError('companyName', getCompanyNameError(value));
        } else if (section === 'company' && field === 'website') {
            setFieldError('companyWebsite', getCompanyWebsiteError(value));
        } else if (section === 'company' && field === 'companyType') {
            setFieldError('companyType', getCompanyTypeError(value));
            // Tür değişince "Diğer" serbest metninin geçerliliği de değişir.
            setFieldError('companyTypeOther', getCompanyTypeOtherError(value, form.company.companyTypeOther));
            if (companyTypeRef.current) {
                const input = companyTypeRef.current.querySelector('input');
                if (input) input.setCustomValidity('');
            }
        } else if (section === 'company' && field === 'companyTypeOther') {
            setFieldError('companyTypeOther', getCompanyTypeOtherError(form.company.companyType, value));
        } else if (section === 'company' && field === 'email') {
            setFieldError('companyEmail', getCompanyEmailError(value));
        } else if (section === 'user' && field === 'firstName') {
            setFieldError('firstName', getFirstNameError(value));
        } else if (section === 'user' && field === 'lastName') {
            setFieldError('lastName', getLastNameError(value));
        } else if (section === 'user' && field === 'email') {
            setFieldError('userEmail', getUserEmailError(value));
        } else if (section === 'user' && field === 'password') {
            setFieldError('password', getPasswordError(value));
            if (form.user.passwordConfirm) {
                setFieldError('passwordConfirm', getPasswordConfirmError(form.user.passwordConfirm, value));
            }
        } else if (section === 'user' && field === 'passwordConfirm') {
            setFieldError('passwordConfirm', getPasswordConfirmError(value, form.user.password));
        } else if (section === 'company' && field === 'com') {}
    };

    const handlePhoneValueChange = (section, field) => (value) => {
        setForm(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));

        if (section === 'company') {
            setFieldError('companyPhone', getCompanyPhoneError(value, companyCountry));
        } else {
            setFieldError('userPhone', getUserPhoneError(value, userCountry));
        }
    };

    const handleCompanyCountryChange = (newCountry) => {
        setCompanyCountry(newCountry);
        setFieldError('companyPhone', getCompanyPhoneError(form.company.phone, newCountry));
    };

    const handleUserCountryChange = (newCountry) => {
        setUserCountry(newCountry);
        setFieldError('userPhone', getUserPhoneError(form.user.phone, newCountry));
    };

    // "Şirket ile aynı" durumu ayrı bir state değil, değerlerin eşitliğinden türetilir:
    // kullanıcı kutuyu görmeden aynı bilgiyi yazsa da kutu kendiliğinden işaretlenir.
    const sameEmail = !!form.company.email
        && normalizeEmail(form.user.email) === normalizeEmail(form.company.email);
    const samePhone = !!form.company.phone
        && normalizePhone(userCountry.dialCode, form.user.phone) === normalizePhone(companyCountry.dialCode, form.company.phone);

    const toggleSameEmail = (checked) => {
        const value = checked ? form.company.email : '';
        setForm(prev => ({ ...prev, user: { ...prev.user, email: value } }));
        setFieldError('userEmail', getUserEmailError(value));
    };

    const toggleSamePhone = (checked) => {
        const value = checked ? form.company.phone : '';
        const country = checked ? companyCountry : userCountry;
        setForm(prev => ({ ...prev, user: { ...prev.user, phone: value } }));
        setUserCountry(country);
        setFieldError('userPhone', getUserPhoneError(value, country));
    };

    const validateCompanyStep = () => {
        const newErrors = {};
        const nameError = getCompanyNameError(form.company.name);
        const websiteError = getCompanyWebsiteError(form.company.website);
        const phoneError = getCompanyPhoneError(form.company.phone, companyCountry);
        const emailError = getCompanyEmailError(form.company.email);
        const typeError = getCompanyTypeError(form.company.companyType);
        const typeOtherError = getCompanyTypeOtherError(form.company.companyType, form.company.companyTypeOther);
        if (nameError) newErrors.companyName = nameError;
        if (websiteError) newErrors.companyWebsite = websiteError;
        if (phoneError) newErrors.companyPhone = phoneError;
        if (emailError) newErrors.companyEmail = emailError;
        if (typeError) newErrors.companyType = typeError;
        if (typeOtherError) newErrors.companyTypeOther = typeOtherError;
        return newErrors;
    };

    const validateUserStep = () => {
        const newErrors = {};
        const firstNameError = getFirstNameError(form.user.firstName);
        const lastNameError = getLastNameError(form.user.lastName);
        const emailError = getUserEmailError(form.user.email);
        const phoneError = getUserPhoneError(form.user.phone, userCountry);
        const passwordError = getPasswordError(form.user.password);
        const passwordConfirmError = getPasswordConfirmError(form.user.passwordConfirm, form.user.password);
        if (firstNameError) newErrors.firstName = firstNameError;
        if (lastNameError) newErrors.lastName = lastNameError;
        if (emailError) newErrors.userEmail = emailError;
        if (phoneError) newErrors.userPhone = phoneError;
        if (passwordError) newErrors.password = passwordError;
        if (passwordConfirmError) newErrors.passwordConfirm = passwordConfirmError;
        return newErrors;
    };

    const handleNext = () => {
        const validationErrors = validateCompanyStep();
        if (Object.keys(validationErrors).length === 0) {
            setStep(2);
            setErrors({});
        } else {
            setErrors(validationErrors);
            if (validationErrors.companyType && companyTypeRef.current) {
                const input = companyTypeRef.current.querySelector('input');
                if (input) {
                    input.setCustomValidity('Seçim yapmadınız');
                }
            }
            if (formRef.current) {
                formRef.current.reportValidity();
            }
        }
    };

    const handleBack = () => {
        setStep(1);
        setErrors({});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateUserStep();

        if (Object.keys(validationErrors).length === 0) {
            // we will submit down below
        } else {
            setErrors(validationErrors);
            if (formRef.current) {
                formRef.current.reportValidity();
            }
            return;
        }

        try {
            setLoading(true);
                const registerData = {
                    company: {
                        ...form.company,
                        phone: `+${companyCountry.dialCode}${form.company.phone.replace(/\s+/g, '')}`,
                        // Serbest metin yalnızca "Diğer" seçildiğinde anlamlı
                        companyTypeOther: form.company.companyType === OTHER_COMPANY_TYPE
                            ? form.company.companyTypeOther.trim()
                            : null,
                        status: 'ACTIVE'
                    },
                    user: {
                        ...form.user,
                        // Rol backend'de atanır: kayıt olan kullanıcı şirket sahibidir.
                        // Ad ve soyad ayrı gider; birleştirme backend'de de yapılmaz.
                        phone: `+${userCountry.dialCode}${form.user.phone.replace(/\s+/g, '')}`
                    }
                };

                const response = await axios.post(`${API_URL}/auth/register`, registerData);

                // Backend başarı durumunda AuthResponse döner (success alanı yoktur),
                // hata durumunda axios zaten exception fırlatır.
                setErrors({});
                setSuccessMessage(response.data.message || "Kaydınız başarıyla tamamlandı");
                setAlertOpen(true);
                setTimeout(() => navigate("/admin/login"), 1500);
            } catch (err) {
                const backendErrors = err.response?.data?.errors;

                if (backendErrors && typeof backendErrors === 'object' && Object.keys(backendErrors).length > 0) {
                    const mappedErrors = {};
                    const unmappedMessages = [];
                    let hasCompanyError = false;

                    Object.entries(backendErrors).forEach(([key, value]) => {
                        const message = Array.isArray(value) ? value.join(' ') : value;
                        const mappedKey = BACKEND_FIELD_MAP[key];

                        if (mappedKey) {
                            mappedErrors[mappedKey] = message;
                            if (COMPANY_ONLY_FIELDS.has(mappedKey)) {
                                hasCompanyError = true;
                            }
                        } else if (COMPANY_ONLY_FIELDS.has(key)) {
                            mappedErrors[key] = message;
                            hasCompanyError = true;
                        } else {
                            unmappedMessages.push(message);
                        }
                    });

                    if (unmappedMessages.length > 0) {
                        mappedErrors.submit = unmappedMessages.join(' ');
                    }

                    if (hasCompanyError) {
                        setStep(1);
                    }
                    setErrors(mappedErrors);
                } else {
                    setErrors({ submit: err.response?.data?.message || "Kayıt sırasında bir hata oluştu." });
                }
            } finally {
                setLoading(false);
            }
    };

    const errorMessages = Object.values(errors).filter(Boolean);
    const errorSignature = errorMessages.join('|');

    // Yeni bir hata kümesi oluştuğunda bildirimi (yeniden) aç; kullanıcı
    // kapatsa bile alan altındaki helperText mesajları kalıcı olarak görünür.
    useEffect(() => {
        if (errorMessages.length > 0) {
            setAlertOpen(true);
        }
    }, [errorSignature]);

    if (!accountType) {
        return <AccountTypeChoice onSelect={setAccountType} />;
    }

    if (accountType === 'employee') {
        return <RegisterEmployee onBack={() => setAccountType(null)} />;
    }

    return (
        <Container component="main" maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
                <Typography component="h1" variant="h5" align="center" gutterBottom>
                    {step === 1 ? 'Şirket Bilgileri' : 'Yönetici Hesabı'}
                </Typography>

                <Box sx={{ textAlign: 'center', mb: 1 }}>
                    <Button size="small" onClick={() => { setAccountType(null); setStep(1); }}>
                        Hesap türünü değiştir
                    </Button>
                </Box>

                <Box sx={{ width: '100%', mb: 4 }}>
                    <Stepper activeStep={step - 1} alternativeLabel>
                        <Step>
                            <StepLabel>Şirket Bilgileri</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Yönetici Hesabı</StepLabel>
                        </Step>
                    </Stepper>
                </Box>

                <Snackbar
                    open={alertOpen && (Boolean(successMessage) || errorMessages.length > 0)}
                    autoHideDuration={6000}
                    onClose={(_, reason) => {
                        if (reason === 'clickaway') return;
                        setAlertOpen(false);
                    }}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <Alert severity={successMessage ? "success" : "error"} onClose={() => setAlertOpen(false)} sx={{ width: '100%', maxWidth: 400 }}>
                        {successMessage ? (
                            successMessage
                        ) : errorMessages.length === 1 ? (
                            errorMessages[0]
                        ) : (
                            <>
                                <AlertTitle>Lütfen aşağıdaki hataları düzeltin</AlertTitle>
                                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                                    {errorMessages.map((message, index) => (
                                        <li key={index}>{message}</li>
                                    ))}
                                </Box>
                            </>
                        )}
                    </Alert>
                </Snackbar>

                <form ref={formRef}
                      onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNext(); } : handleSubmit}
                      noValidate
                      style={{width:'100%'}}>
                    {step === 1 ? (
                        <Grid container spacing={2.5}>
                            <Grid item xs={12}>
                                <TextField
                                    required
                                    fullWidth
                                    label="Firma Adı"
                                    value={form.company.name}
                                    onChange={handleChange('company', 'name')}
                                    error={!!errors.companyName}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    select
                                    required
                                    fullWidth
                                    label="Şirket Türü"
                                    value={form.company.companyType}
                                    onChange={handleChange('company', 'companyType')}
                                    error={!!errors.companyType}
                                    ref={companyTypeRef}
                                >
                                    {companyTypes.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            {form.company.companyType === OTHER_COMPANY_TYPE && (
                                <Grid item xs={12}>
                                    <TextField
                                        required
                                        fullWidth
                                        label="Şirket Türünüz"
                                        placeholder="Örn: Lojistik, Eğitim, Sağlık..."
                                        value={form.company.companyTypeOther}
                                        onChange={handleChange('company', 'companyTypeOther')}
                                        error={!!errors.companyTypeOther}
                                    />
                                </Grid>
                            )}
                            <Grid item xs={12}>
                                <CountryPhoneInput
                                    label="Telefon"
                                    required
                                    value={form.company.phone}
                                    onValueChange={handlePhoneValueChange('company', 'phone')}
                                    country={companyCountry}
                                    onCountryChange={handleCompanyCountryChange}
                                    error={!!errors.companyPhone}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    label="E-posta"
                                    type="email"
                                    value={form.company.email}
                                    onChange={handleChange('company', 'email')}
                                    error={!!errors.companyEmail}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Website"
                                    required
                                    value={form.company.website}
                                    onChange={handleChange('company', 'website')}
                                    error={!!errors.companyWebsite}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Açıklama"
                                    multiline
                                    rows={2}
                                    value={form.company.description}
                                    onChange={handleChange('company', 'description')}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Adres"
                                    multiline
                                    rows={2}
                                    value={form.company.address}
                                    onChange={handleChange('company', 'address')}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    fullWidth
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                >
                                    İleri
                                </Button>
                            </Grid>
                        </Grid>
                    ) : (
                        <Grid container spacing={2.5}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    label="Ad"
                                    value={form.user.firstName}
                                    onChange={handleChange('user', 'firstName')}
                                    error={!!errors.firstName}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    label="Soyad"
                                    value={form.user.lastName}
                                    onChange={handleChange('user', 'lastName')}
                                    error={!!errors.lastName}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    required
                                    fullWidth
                                    label="E-posta"
                                    type="email"
                                    value={form.user.email}
                                    onChange={handleChange('user', 'email')}
                                    error={!!errors.userEmail}
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={sameEmail} onChange={(e) => toggleSameEmail(e.target.checked)} />}
                                    label="Şirket e-postasıyla aynı"
                                    disabled={!form.company.email}
                                />
                                {sameEmail && (
                                    <Typography variant="caption" color="warning.main" display="block">
                                        Yönetici e-postası şirket e-postasıyla aynı.
                                    </Typography>
                                )}
                            </Grid>
                            <Grid item xs={12}>
                                <CountryPhoneInput
                                    label="Telefon"
                                    required
                                    value={form.user.phone}
                                    onValueChange={handlePhoneValueChange('user', 'phone')}
                                    country={userCountry}
                                    onCountryChange={handleUserCountryChange}
                                    error={!!errors.userPhone}
                                />
                                <FormControlLabel
                                    control={<Checkbox checked={samePhone} onChange={(e) => toggleSamePhone(e.target.checked)} />}
                                    label="Şirket telefonuyla aynı"
                                    disabled={!form.company.phone}
                                />
                                {samePhone && (
                                    <Typography variant="caption" color="warning.main" display="block">
                                        Yönetici telefonu şirket telefonuyla aynı.
                                    </Typography>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    label="Şifre"
                                    type="password"
                                    value={form.user.password}
                                    onChange={handleChange('user', 'password')}
                                    error={!!errors.password}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    required
                                    fullWidth
                                    label="Şifre Tekrar"
                                    type="password"
                                    value={form.user.passwordConfirm}
                                    onChange={handleChange('user', 'passwordConfirm')}
                                    error={!!errors.passwordConfirm}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={handleBack}
                                >
                                    Geri
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    fullWidth
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={loading}
                                >
                                    {loading ? <CircularProgress size={24} /> : 'Kaydı Tamamla'}
                                </Button>
                            </Grid>
                        </Grid>
                    )}
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