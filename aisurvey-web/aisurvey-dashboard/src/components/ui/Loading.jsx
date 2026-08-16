import React from 'react';

const Loading = ({ message = "Yükleniyor..." }) => {
    return (
        <div className="flex items-center justify-center py-12">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-4"></div>
                <p className="text-lg text-gray-600">{message}</p>
            </div>
        </div>
    );
};

export default Loading;