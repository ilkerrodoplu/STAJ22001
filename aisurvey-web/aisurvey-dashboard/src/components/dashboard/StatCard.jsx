import React from 'react';

const StatCard = ({ title, value, color, icon, subtitle, onClick, isClickable = false }) => {
    const cardClass = `
    rounded-xl shadow-md p-4 flex items-center gap-4 
    bg-gradient-to-tr ${color} text-white 
    transition-transform duration-200 min-h-[100px]
    ${isClickable ? 'cursor-pointer hover:scale-[1.035]' : 'hover:scale-[1.02]'}
  `;

    const CardContent = () => (
        <>
      <span className="bg-white/20 p-2 rounded-full flex-shrink-0">
        {icon}
      </span>
            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xl font-bold truncate">{value}</span>
                <span className="text-sm font-medium truncate">{title}</span>
                {subtitle && (
                    <span className="text-xs opacity-80 truncate">{subtitle}</span>
                )}
            </div>
        </>
    );

    if (isClickable && onClick) {
        return (
            <button onClick={onClick} className={cardClass}>
                <CardContent />
            </button>
        );
    }

    return (
        <div className={cardClass}>
            <CardContent />
        </div>
    );
};

export default StatCard;