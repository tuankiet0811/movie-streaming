const express = require("express");
const router = express.Router();
const UserService = require("../Services/UserService");
const jsonwebtoken = require("jsonwebtoken");
const config = require("../../Config/Setting.json");

const jwtExpirySeconds = 86400; 

router.get("/login", (req, res) => {
    res.render("auth/login", { message: null });
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const service = new UserService();
    try {
        const user = await service.login(email, password);
        if (!user) {
            return res.render("auth/login", { message: "Invalid email or password" });
        }

        const token = jsonwebtoken.sign(
            { user: user.email, role: user.role, name: user.name },
            config.jwt.secret,
            { expiresIn: jwtExpirySeconds }
        );

        res.cookie('token', token, { maxAge: jwtExpirySeconds * 1000, httpOnly: true });
        
        if (user.role === "admin") {
            res.redirect("/admin");
        } else {
            res.redirect("/home");
        }
    } catch (error) {
        console.error(error);
        res.render("auth/login", { message: "An error occurred" });
    }
});

router.get("/register", (req, res) => {
    res.render("auth/register", { message: null });
});

router.post("/register", async (req, res) => {
    const { email, password, confirm_password, name } = req.body;
    
    if (password !== confirm_password) {
        return res.render("auth/register", { message: "Mật khẩu xác nhận không khớp" });
    }

    const service = new UserService();
    try {
        await service.register(email, password, name);
        res.redirect("/auth/login");
    } catch (error) {
        res.render("auth/register", { message: error.message });
    }
});

router.post("/create-admin-secret-endpoint", async (req, res) => {
    const { email, password, name, secret_key } = req.body;
    
    
    if (secret_key !== "your_super_secret_admin_key_123") {
        return res.status(403).json({ message: "Forbidden" });
    }

    const service = new UserService();
    try {
        const user = await service.registerAdmin(email, password, name);
        res.status(201).json({ message: "Admin created successfully", user: { email: user.email, name: user.name, role: user.role } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/auth/login");
});

module.exports = router;
