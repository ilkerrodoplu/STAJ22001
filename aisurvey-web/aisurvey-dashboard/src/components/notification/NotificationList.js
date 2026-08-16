import React from 'react';
import NotificationCard from './NotificationCard';
import NotificationEmptyState from './NotificationEmptyState';

const NotificationList = ({
                              notifications,
                              filter,
                              onNotificationClick,
                              onMarkAsRead,
                              onDeleteNotification
                          }) => {
    if (notifications.length === 0) {
        return <NotificationEmptyState filter={filter} />;
    }

    return (
        <div className="space-y-4">
            {notifications.map((notification) => (
                <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onClick={() => onNotificationClick(notification)}
                    onMarkAsRead={onMarkAsRead}
                    onDelete={onDeleteNotification}
                />
            ))}
        </div>
    );
};

export default NotificationList;