import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ChevronLeft, Send, ShieldCheck, MessageCircle } from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

const formatTime = (value) =>
    value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '';

/**
 * Şirket kullanıcılarının site yönetimiyle (süper admin) yazışması.
 * Askıya alınan anketin yeniden yayına alınması da buradan talep edilir.
 */
export default function Messages() {
    const [messages, setMessages] = useState([]);
    const [body, setBody] = useState('');
    // Askıdaki anketler; talebi ankete bağlamak süper adminin hangi anketten
    // söz edildiğini tahmin etmesini gerektirmiyor.
    const [suspended, setSuspended] = useState([]);
    const [surveyTemplateId, setSurveyTemplateId] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const bottomRef = useRef(null);

    const fetchThread = useCallback(() => {
        axios.get(`${API_BASE_URL}/messages`, { headers: authHeader() })
            .then(res => { setMessages(res.data || []); setError(null); })
            .catch(err => {
                console.error('Mesajlar yüklenirken hata:', err);
                setError('Mesajlar yüklenemedi.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchThread(); }, [fetchThread]);

    useEffect(() => {
        axios.get(`${API_BASE_URL}/survey-templates`, { headers: authHeader() })
            .then(res => setSuspended((res.data || []).filter(t => t.suspendedByAdmin)))
            .catch(() => setSuspended([]));
    }, []);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = async (e) => {
        e.preventDefault();
        if (!body.trim()) return;

        try {
            setSending(true);
            const response = await axios.post(`${API_BASE_URL}/messages`,
                { body: body.trim(), surveyTemplateId }, { headers: authHeader() });
            setMessages(prev => [...prev, response.data]);
            setBody('');
            setSurveyTemplateId('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Mesaj gönderilemedi');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/admin/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Site Yönetimi</h1>
            </div>

            <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 p-4">
                    <ShieldCheck size={18} className="text-indigo-600" />
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Site Yönetimi ile yazışma</div>
                        <div className="text-xs text-gray-600">
                            Anket uyarıları, askıya alınan anketin yeniden yayına alınması ve diğer talepler.
                        </div>
                    </div>
                </div>

                <div className="max-h-[55vh] min-h-[240px] space-y-3 overflow-y-auto bg-gray-50 p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                            <p className="text-sm text-gray-600">Yükleniyor...</p>
                        </div>
                    ) : error ? (
                        <p className="text-sm text-red-600">{error}</p>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <MessageCircle size={32} strokeWidth={1} className="text-gray-400" />
                            <p className="text-sm text-gray-600">
                                Henüz mesaj yok. Site yönetimine ilk mesajınızı gönderin.
                            </p>
                        </div>
                    ) : (
                        messages.map(message => (
                            <div
                                key={message.id}
                                className={`flex ${message.fromAdmin ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${
                                    message.fromAdmin
                                        ? 'bg-white border border-gray-200 text-gray-800'
                                        : 'bg-indigo-600 text-white'
                                }`}>
                                    <div className={`text-xs mb-1 ${message.fromAdmin ? 'text-indigo-700' : 'text-indigo-100'}`}>
                                        {message.fromAdmin ? 'Site Yönetimi' : message.senderName || 'Siz'}
                                        {' · '}{formatTime(message.createdAt)}
                                    </div>
                                    {message.surveyName && (
                                        <div className={`mb-1 text-xs font-medium ${
                                            message.fromAdmin ? 'text-gray-600' : 'text-indigo-100'
                                        }`}>
                                            Anket: {message.surveyName}
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap text-sm">{message.body}</div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>

                <form onSubmit={send} className="flex flex-col gap-2 border-t border-gray-200 p-3">
                    {suspended.length > 0 && (
                        <select
                            value={surveyTemplateId}
                            onChange={(e) => setSurveyTemplateId(e.target.value)}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="">Anket seçilmedi (genel mesaj)</option>
                            {suspended.map(template => (
                                <option key={template.id} value={template.id}>
                                    Askıdaki anket: {template.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <div className="flex items-end gap-2">
                    <textarea
                        rows={2}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        type="submit"
                        disabled={sending || !body.trim()}
                        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                        <Send size={16} />
                        <span>Gönder</span>
                    </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
