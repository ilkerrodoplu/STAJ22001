import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ChevronLeft, Send, Building2, MessageCircle } from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

const formatTime = (value) =>
    value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '';

/** Süper adminin şirketlerle yazışması: solda konuşmalar, sağda seçili konuşma. */
export default function SuperAdminMessages() {
    const [threads, setThreads] = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    const fetchThreads = useCallback(() => {
        axios.get(`${API_BASE_URL}/admin/messages`, { headers: authHeader() })
            .then(res => setThreads(res.data || []))
            .catch(err => console.error('Konuşmalar yüklenemedi:', err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchThreads(); }, [fetchThreads]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const openThread = async (thread) => {
        setSelected(thread);
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/messages/${thread.companyId}`,
                { headers: authHeader() });
            setMessages(response.data || []);
            // Okundu işaretlendi; listedeki rozet de sıfırlanmalı.
            setThreads(prev => prev.map(t =>
                t.companyId === thread.companyId ? { ...t, unreadCount: 0 } : t));
        } catch {
            toast.error('Konuşma açılamadı');
        }
    };

    const reply = async (e) => {
        e.preventDefault();
        if (!body.trim() || !selected) return;

        try {
            setSending(true);
            const response = await axios.post(`${API_BASE_URL}/admin/messages/${selected.companyId}`,
                { body: body.trim() }, { headers: authHeader() });
            setMessages(prev => [...prev, response.data]);
            setBody('');
            fetchThreads();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Mesaj gönderilemedi');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/admin/super/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Şirket Mesajları</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Konuşma listesi */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm lg:col-span-1">
                    <div className="border-b border-gray-200 p-4 text-sm font-semibold text-gray-900">
                        Konuşmalar
                    </div>
                    {loading ? (
                        <p className="p-4 text-sm text-gray-600">Yükleniyor...</p>
                    ) : threads.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 p-8 text-center">
                            <MessageCircle size={28} strokeWidth={1} className="text-gray-400" />
                            <p className="text-sm text-gray-600">Henüz mesaj gönderen şirket yok.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                            {threads.map(thread => (
                                <li key={thread.companyId}>
                                    <button
                                        onClick={() => openThread(thread)}
                                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                                            selected?.companyId === thread.companyId ? 'bg-indigo-50' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-2 font-medium text-gray-900">
                                                <Building2 size={14} className="text-gray-400" />
                                                {thread.companyName || 'Bilinmeyen firma'}
                                            </span>
                                            {thread.unreadCount > 0 && (
                                                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                                                    {thread.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 truncate text-xs text-gray-600">
                                            {thread.lastFromAdmin ? 'Siz: ' : ''}{thread.lastMessage}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-400">{formatTime(thread.lastMessageAt)}</div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Seçili konuşma */}
                <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm lg:col-span-2">
                    {!selected ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
                            <MessageCircle size={32} strokeWidth={1} className="text-gray-400" />
                            <p className="text-sm text-gray-600">Soldan bir şirket seçin.</p>
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-gray-200 p-4 text-sm font-semibold text-gray-900">
                                {selected.companyName}
                            </div>

                            <div className="max-h-[50vh] min-h-[240px] space-y-3 overflow-y-auto bg-gray-50 p-4">
                                {messages.map(message => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.fromAdmin ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${
                                            message.fromAdmin
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white border border-gray-200 text-gray-800'
                                        }`}>
                                            <div className={`text-xs mb-1 ${message.fromAdmin ? 'text-indigo-100' : 'text-indigo-700'}`}>
                                                {message.fromAdmin ? 'Site Yönetimi' : message.senderName || message.senderEmail}
                                                {' · '}{formatTime(message.createdAt)}
                                            </div>
                                            {/* Askı kaldırma talebi hangi ankete ait, tahmin edilmesin. */}
                                            {message.surveyName && (
                                                <div className={`mb-1 text-xs font-medium ${
                                                    message.fromAdmin ? 'text-indigo-100' : 'text-gray-600'
                                                }`}>
                                                    Anket: {message.surveyName}
                                                </div>
                                            )}
                                            <div className="whitespace-pre-wrap text-sm">{message.body}</div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={bottomRef} />
                            </div>

                            <form onSubmit={reply} className="flex items-end gap-2 border-t border-gray-200 p-3">
                                <textarea
                                    rows={2}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Yanıtınızı yazın..."
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
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
