import React from 'react';
import { Star } from 'lucide-react';

/**
 * Bir anket yanıtının verdiği bütün cevaplar: yıldızlı sorular, şıklar ve varsa
 * serbest yorum. Yorum yazmayan müşterinin yanıtı da burada görünür.
 */
export default function SurveyAnswers({ response }) {
    const ratings = Object.entries(response?.ratings || {});
    const choices = Object.entries(response?.choices || {});

    if (ratings.length === 0 && choices.length === 0 && !response?.comment) {
        return <p className="text-sm text-gray-500">Bu yanıtta kayıtlı cevap yok.</p>;
    }

    return (
        <div className="space-y-4">
            {ratings.map(([question, stars]) => (
                <div key={question} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-gray-800">{question}</span>
                    <span className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star
                                key={star}
                                size={16}
                                className={star <= stars ? 'text-amber-400' : 'text-gray-300'}
                                fill={star <= stars ? 'currentColor' : 'none'}
                            />
                        ))}
                        <span className="ml-1 text-xs text-gray-600">{stars}/5</span>
                    </span>
                </div>
            ))}

            {choices.map(([question, choice]) => (
                <div key={question} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-gray-800">{question}</span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {choice}
                    </span>
                </div>
            ))}

            {response?.comment && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Yorum</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg border-l-4 border-blue-400 bg-gray-50 p-3 text-sm italic text-gray-700">
                        {response.comment}
                    </p>
                </div>
            )}
        </div>
    );
}
