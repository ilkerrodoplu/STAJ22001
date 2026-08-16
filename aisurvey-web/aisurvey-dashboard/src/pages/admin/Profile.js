import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, Mail, Phone, MapPin, Shield, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { roleLabel } from '../../utils/roles';
import { fullName } from '../../utils/userName';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

export default function Profile() {
    const navigate = useNavigate();
    const { userProfile } = useAuth();

    // userProfile (localStorage) anında gösterilir, API yanıtı gelince güncellenir.
    const [profile, setProfile] = useState(userProfile || {});
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        axios
            .get(`${API_BASE_URL}/users/profile`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setProfile(res.data))
            .catch(err => {
                console.error('Profil bilgileri yüklenemedi:', err);
                setError('Profil bilgileri sunucudan alınamadı, kayıtlı bilgiler gösteriliyor.');
            });
    }, []);

    const displayName = fullName(profile);

    const rows = [
        { icon: Mail, label: 'E-posta', value: profile.email },
        { icon: Phone, label: 'Telefon', value: profile.phone },
        { icon: MapPin, label: 'Adres', value: profile.address },
        { icon: Shield, label: 'Rol', value: roleLabel(profile.roles) }
    ];

    return (
        <div className="profile-page">
            <div className="page-header">
                <div className="header-content">
                    <h1 className="page-title">Profil</h1>
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => navigate('/admin/settings')}
                    >
                        <SettingsIcon size={16} />
                        <span>Bilgileri Düzenle</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={20} />
                    <p>{error}</p>
                </div>
            )}

            <div className="card">
                <div className="card-body">
                    <div className="profile-identity">
                        <div className="profile-avatar">{getInitials(displayName)}</div>
                        <div>
                            <h2 className="profile-name">{displayName}</h2>
                            <p className="text-muted">{profile.email}</p>
                        </div>
                    </div>

                    <div className="profile-details">
                        {rows.map(({ icon: Icon, label, value }) => (
                            <div key={label} className="profile-detail-row">
                                <div className="profile-detail-label">
                                    <Icon size={16} />
                                    <span>{label}</span>
                                </div>
                                <div className="profile-detail-value">
                                    {value || <span className="text-muted">Belirtilmemiş</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
