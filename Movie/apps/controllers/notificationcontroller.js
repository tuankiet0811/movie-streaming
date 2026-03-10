var express = require("express");
var router = express.Router();
var verifyWebToken = require("../Util/VerifyWebToken");
var DatabaseConnection = require('../Database/Database');
var Config = require('../../Config/Setting.json');
var NotificationRepository = require('../Repository/NotificationRepository');

router.get("/list", verifyWebToken, async function(req, res) {
    try {
        var client = DatabaseConnection.getMongoClient();
        var database = client.db(Config.mongodb.database);
        var repo = new NotificationRepository(database);
        
        const notifications = await repo.getUserNotifications(req.userData.email, 20);
        const unreadCount = await repo.getUnreadCount(req.userData.email);
        
        res.json({ status: true, data: notifications, unreadCount: unreadCount });
    } catch (e) {
        console.error("Get notifications error:", e);
        res.status(500).json({ status: false, message: "Error" });
    }
});

router.post("/read", verifyWebToken, async function(req, res) {
    try {
        var client = DatabaseConnection.getMongoClient();
        var database = client.db(Config.mongodb.database);
        var repo = new NotificationRepository(database);
        
        if (req.body && req.body.id) {
             await repo.markAsRead(req.body.id);
        } else {
             await repo.markAllAsRead(req.userData.email);
        }
       
        res.json({ status: true });
    } catch (e) {
        console.error("Mark read error:", e);
        res.status(500).json({ status: false });
    }
});

module.exports = router;