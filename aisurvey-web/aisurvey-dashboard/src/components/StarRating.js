import React from 'react';
import './StarRating.css';

const StarRating = ({ value, onChange }) => {
    const stars = [1, 2, 3, 4, 5];

    return (
        <div className="star-rating">
            {stars.map((star) => (
                <span
                    key={star}
                    className={star <= value ? "star filled" : "star"}
                    onClick={() => onChange(star)}
                >
          ★
        </span>
            ))}
        </div>
    );
};

export default StarRating;