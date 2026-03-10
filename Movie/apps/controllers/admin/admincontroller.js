var express = require("express");
var router = express.Router();
var UserService = require("../../Services/UserService");
var jsonwebtoken = require("jsonwebtoken");
var config = require(global.__basedir + "/Config/Setting.json");


router.use((req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = jsonwebtoken.verify(token, config.jwt.secret);
            res.locals.user = decoded;
        } catch (err) {
            console.error("Token verification failed:", err.message);
        }
    }
    next();
});

router.get("/", async function(req,res){
    try {
        var DatabaseConnection = require(global.__basedir + '/apps/Database/Database');
        var Config = require(global.__basedir + "/Config/Setting.json");
        var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");
        var MovieRepository = require(global.__basedir + "/apps/Repository/MovieRepository");

        var client = DatabaseConnection.getMongoClient();
        var database = client.db(Config.mongodb.database);
        
        var userRepo = new UserRepository(database);
        var movieRepo = new MovieRepository(database);

        const totalUsers = await userRepo.countUsers();
        const totalMovies = await movieRepo.countMovies();
        const totalViews = await movieRepo.getTotalViews();
        const avgRating = await movieRepo.getAverageRating();

        const topMovies = await movieRepo.getPopularMovies(0, 3);
        const recentUsers = await userRepo.getRecentUsers(5);

        res.render("admin/dashboard", { 
            page: 'dashboard',
            stats: {
                totalUsers,
                totalMovies,
                totalViews,
                avgRating
            },
            topMovies,
            recentUsers
        });
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
        res.render("admin/dashboard", { 
            page: 'dashboard',
            stats: {
                totalUsers: 0,
                totalMovies: 0,
                totalViews: 0,
                avgRating: 0
            },
            topMovies: [],
            recentUsers: []
        });
    }
});

router.get("/signin", function(req,res){
    res.render("admin/signin");
});

router.use("/moviemanage", require("./moviemanagecontroller"));
router.use("/categorymanage", require("./categorymanagecontroller"));
router.use("/reviewmanage", require("./reviewmanagecontroller"));

router.get("/usermanage", async function(req, res){
    try {
        const userService = new UserService();
        const users = await userService.getAllUsers();
        res.render("admin/userManage", { users: users, page: 'users' });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.render("admin/userManage", { users: [], page: 'users' });
    }
});

module.exports = router;
