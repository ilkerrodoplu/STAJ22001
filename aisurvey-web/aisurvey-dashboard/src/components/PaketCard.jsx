import React from 'react';


const handleEnroll = () => {
    // Tam sayfa yönlendirme
    window.location.href = '/auth/register';
};
const PaketCard = ({ p }) => (

    <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-xl font-semibold mb-2">{p.name}</h4>
        <p className="text-sm text-gray-600 mb-4">{p.desc}</p>
        <div className="mb-4">
            <span className="text-2xl font-bold">{p.price}</span> <span className="text-sm text-gray-600"> / ay</span>
        </div>
        <ul className="text-sm text-gray-700 space-y-1 mb-4">
            {p.features.map((f, idx) => (
                <li key={idx}>{f}</li>
            ))}
        </ul>
        <button onClick={handleEnroll} className="bg-blue-600 text-white px-6 py-3 rounded-md">Deneme Başlat</button>

    </div>
);

export default PaketCard;