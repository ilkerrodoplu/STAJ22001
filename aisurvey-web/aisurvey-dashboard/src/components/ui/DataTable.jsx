import React from 'react';

const DataTable = ({ quarterlyData }) => {
    if (!quarterlyData || quarterlyData.length === 0) {
        return null;
    }

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 border">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Çeyrek Dönem Detay Tablosu</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dönem
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ortalama Puan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Toplam Yanıt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pozitif
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Negatif
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nötr
                        </th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {quarterlyData.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.quarter || `Q${item.quarterNumber}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      (item.averageRating || 0) >= 4 ? 'bg-green-100 text-green-800' :
                          (item.averageRating || 0) >= 3 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                  }`}>
                    {(item.averageRating || 0).toFixed(2)}
                  </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="font-medium">
                    {(item.totalResponses || 0).toLocaleString()}
                  </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                      {(item.positiveResponses || 0).toLocaleString()}
                  </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                      {(item.negativeResponses || 0).toLocaleString()}
                  </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                      {(item.neutralResponses || 0).toLocaleString()}
                  </span>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;