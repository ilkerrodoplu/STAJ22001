import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, RefreshCw, Search as SearchIcon } from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

const LINE_OPTIONS = [100, 300, 1000, 2000];

// Log seviyesi satırın rengini belirler; hataları taramak kolay olsun.
const lineClass = (line) => {
    if (/\bERROR\b/.test(line)) return 'text-red-400';
    if (/\bWARN\b/.test(line)) return 'text-amber-300';
    if (/\bDEBUG\b|\bTRACE\b/.test(line)) return 'text-gray-500';
    return 'text-gray-200';
};

/** Süper admin: uygulama loglarının son satırları. */
export default function SuperAdminLogs() {
    const [lines, setLines] = useState([]);
    const [file, setFile] = useState('');
    const [limit, setLimit] = useState(300);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLogs = useCallback((count) => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/admin/logs`, { headers: authHeader(), params: { lines: count } })
            .then(res => {
                setLines(res.data.lines || []);
                setFile(res.data.file || '');
                setError(null);
            })
            .catch(err => {
                console.error('Loglar yüklenirken hata:', err);
                setError('Loglar yüklenemedi.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchLogs(limit); }, [limit, fetchLogs]);

    const term = filter.trim().toLowerCase();
    const visible = term ? lines.filter(line => line.toLowerCase().includes(term)) : lines;

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <Link
                    to="/admin/super/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Site Logları</h1>
                <button
                    onClick={() => fetchLogs(limit)}
                    className="ml-auto inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    <span>Yenile</span>
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-gray-200">
                    <div className="relative w-full sm:max-w-md">
                        <input
                            type="text"
                            placeholder="Satırlarda ara (ERROR, e-posta, id...)"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon size={18} />
                        </div>
                    </div>

                    <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {LINE_OPTIONS.map(option => (
                            <option key={option} value={option}>Son {option} satır</option>
                        ))}
                    </select>

                    <span className="text-sm text-gray-600 sm:ml-auto">
                        {visible.length} satır gösteriliyor
                    </span>
                </div>

                {error ? (
                    <p className="p-4 text-sm text-red-600">{error}</p>
                ) : (
                    <>
                        <pre className="max-h-[65vh] overflow-auto bg-gray-900 p-4 text-xs leading-relaxed font-mono rounded-b-lg">
                            {visible.length === 0
                                ? <span className="text-gray-400">Gösterilecek log satırı yok.</span>
                                : visible.map((line, index) => (
                                    <div key={index} className={`whitespace-pre-wrap ${lineClass(line)}`}>{line}</div>
                                ))}
                        </pre>
                        {file && (
                            <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200">
                                Kaynak: {file}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
