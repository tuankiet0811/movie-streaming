var ObjectId = require('mongodb').ObjectId;

class NotificationRepository {
    context;
    session;

    constructor(context, session = null) {
        this.context = context;
        this.session = session;
    }

    async createNotification(notification) {
        return await this.context.collection("notifications").insertOne(notification);
    }

    async getUserNotifications(userEmail, limit = 10) {
        return await this.context.collection("notifications")
            .find({ recipientEmail: userEmail })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    async getUnreadCount(userEmail) {
        return await this.context.collection("notifications").countDocuments({ 
            recipientEmail: userEmail, 
            isRead: false 
        });
    }

    async markAsRead(notificationId) {
        return await this.context.collection("notifications").updateOne(
            { _id: new ObjectId(notificationId) },
            { $set: { isRead: true } }
        );
    }
    
    async markAllAsRead(userEmail) {
         return await this.context.collection("notifications").updateMany(
            { recipientEmail: userEmail, isRead: false },
            { $set: { isRead: true } }
        );
    }
}

module.exports = NotificationRepository;