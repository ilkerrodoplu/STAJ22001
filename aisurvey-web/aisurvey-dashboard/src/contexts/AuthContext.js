
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// API URL'i env'den al, yoksa default değeri kullan
const API_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

// Auth Context oluştur
const AuthContext = createContext(null);

// AuthProvider bileşeni
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userProfile, setUserProfile] = useState({}); // Yeni eklendi
    const [profileLoading, setProfileLoading] = useState(false); // Yeni eklendi

    // Component yüklendiğinde çalışacak
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');

        if (storedUser && token) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setUserProfile(parsedUser);
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Stored user parsing error:', error);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
            }
        }
        setLoading(false);
    }, []);

    // User Profile Fetch - Yeni eklendi
    const fetchUserProfile = useCallback(async () => {
        setProfileLoading(true);
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get(`${API_URL}/users/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setUserProfile(response.data);
            setUser(response.data);

            // LocalStorage'ı da güncelle
            localStorage.setItem('user', JSON.stringify(response.data));

        } catch (error) {
            console.error('User profile fetch failed:', error);
            if (error.response?.status === 401) {
                // Token geçersiz, çıkış yap
                logout();
            }
        } finally {
            setProfileLoading(false);
        }
    }, []);

    // Login işlemi
    const login = async (email, password) => {
        try {
            setLoading(true);

            console.log('Login isteği gönderiliyor:', email);

            const response = await axios.post(`${API_URL}/auth/login`, {
                email,
                password
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Login response:', response);

            if (response.data && response.data.token) {
                // Token ve kullanıcı bilgilerini kaydet
                localStorage.setItem('authToken', response.data.token); // authToken olarak kaydet
                localStorage.setItem('token', response.data.token); // Backward compatibility
                localStorage.setItem('refreshToken', response.data.refreshToken);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                // State'i güncelle
                setUser(response.data.user);
                setUserProfile(response.data.user);
                setIsAuthenticated(true);

                return { success: true, user: response.data.user };
            } else {
                throw new Error('Geçersiz yanıt formatı');
            }
        } catch (error) {
            console.error('Login error:', error);

            const data = error.response?.data;
            let errorMessage = 'Giriş sırasında bir hata oluştu';

            if (error.response) {
                // Backend, kayıtlı olmayan e-posta ile yanlış şifreyi bilerek
                // ayırt etmiyor: aksi halde giriş ekranı, hangi e-postaların
                // sistemde olduğunu dışarıdan sorgulanabilir hale getiriyordu.
                if (error.response.status === 401) {
                    errorMessage = data?.message || 'E-posta veya şifre hatalı';
                } else if (data?.message) {
                    errorMessage = data.message;
                }
            } else if (error.request) {
                errorMessage = 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            // Bu durumların hepsi ekranda kalıcı olarak gösteriliyor (ayrı sayfa
            // ya da geri sayımlı uyarı kutusu); üstüne toast gürültü olur.
            const ekrandaGosteriliyor = ['ACCOUNT_CLOSED', 'ACCOUNT_LOCKED',
                'ACCOUNT_LOCKED_UNTIL_RESET', 'TOO_MANY_REQUESTS'].includes(data?.code);
            if (!ekrandaGosteriliyor) {
                toast.error(errorMessage);
            }

            return { success: false, message: errorMessage, status: error.response?.status, data };
        } finally {
            setLoading(false);
        }
    };

    // Kapatılmış (pasif) hesabı geri alma - pasif kullanıcı normal login'den geçemez
    const reactivate = async (email, password) => {
        try {
            setLoading(true);

            const response = await axios.post(`${API_URL}/auth/reactivate`, { email, password });

            if (!response.data || !response.data.token) {
                throw new Error('Geçersiz yanıt formatı');
            }

            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            setUser(response.data.user);
            setUserProfile(response.data.user);
            setIsAuthenticated(true);

            toast.success('Hesabınız geri alındı');
            return { success: true, user: response.data.user };
        } catch (error) {
            const data = error.response?.data;
            const message = data?.message || 'Hesap geri alınamadı';
            toast.error(message);
            // data da döner: bu uç da hesap kilidi (423 ACCOUNT_LOCKED) verebiliyor,
            // ekranın kalan süreyi gösterebilmesi için yanıtın tamamı gerekli.
            return { success: false, message, status: error.response?.status, data };
        } finally {
            setLoading(false);
        }
    };

    // Register işlemi
    const register = async (name, email, password) => {
        try {
            setLoading(true);

            const response = await axios.post(`${API_URL}/auth/register`, {
                name,
                email,
                password
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.token) {
                localStorage.setItem('authToken', response.data.token);
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                setUser(response.data.user);
                setUserProfile(response.data.user);
                setIsAuthenticated(true);

                return { success: true, user: response.data.user };
            } else {
                throw new Error('Geçersiz yanıt formatı');
            }
        } catch (error) {
            console.error('Register error:', error);

            let errorMessage = 'Kayıt sırasında bir hata oluştu';

            if (error.response) {
                if (error.response.data && error.response.data.errors) {
                    const errorsObj = error.response.data.errors;
                    errorMessage = Object.entries(errorsObj)
                        .map(([key, messages]) => messages.join("\n"))
                        .join("\n");
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.request) {
                errorMessage = 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
            return { success: false, message: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Logout işlemi - Güncellenmiş
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        setUser(null);
        setUserProfile({});
        setIsAuthenticated(false);

        toast.success('Çıkış yapıldı');

        // Redirect URL return et
        return '/admin/login';
    };

    // Auth durumunu kontrol et
    const checkAuthStatus = () => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        return !!token;
    };

    // currentUser alias - Backward compatibility
    const currentUser = user;

    // Context değeri - Genişletilmiş
    const value = {
        user,
        currentUser, // Alias
        userProfile,
        isAuthenticated,
        loading,
        profileLoading,
        login,
        reactivate,
        register,
        logout,
        checkAuthStatus,
        fetchUserProfile
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook - Genişletilmiş
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Backward compatibility için ayrı hook
export const useUserProfile = () => {
    const { userProfile, profileLoading, fetchUserProfile } = useAuth();
    return {
        userProfile,
        profileLoading,
        fetchUserProfile
    };
};

export default AuthContext;
