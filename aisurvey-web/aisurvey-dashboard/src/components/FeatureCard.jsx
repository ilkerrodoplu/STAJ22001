import React from 'react';

const FeatureCard = ({ title, text, icon }) => {
    return (
        <div className="bg-white rounded-lg shadow p-6 flex-1">
            <div className="mb-3 text-xl">{icon}</div>
            <h4 className="font-semibold mb-2">{title}</h4>
            <p className="text-sm text-gray-600">{text}</p>
        </div>
    );
};

export default FeatureCard;