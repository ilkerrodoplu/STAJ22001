import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

class NotificationService {
    async getNotifications(companyId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(`${API_BASE_URL}/api/v1/notifications/company/${companyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    async getUnreadNotifications(companyId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(`${API_BASE_URL}/api/v1/notifications/company/${companyId}/unread`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching unread notifications:', error);
            throw error;
        }
    }

    async getUnreadCount(companyId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(`${API_BASE_URL}/api/v1/notifications/company/${companyId}/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.unreadCount;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }
    }

    async markAsRead(notificationId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.put(`${API_BASE_URL}/api/v1/notifications/${notificationId}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    async markAllAsRead(companyId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.put(`${API_BASE_URL}/api/v1/notifications/company/${companyId}/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    async deleteNotification(notificationId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.delete(`${API_BASE_URL}/api/v1/notifications/${notificationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }
}

export const notificationService = new NotificationService();