var express = require("express");
var router = express.Router();
var verifyWebToken = require("../Util/VerifyWebToken");
var MovieService = require("../Services/MovieService");

router.get("/", verifyWebToken, async function(req, res) {
    var movieService = new MovieService();
    const allGenres = await movieService.getAllGenres();

    
    let wishlist = [];
    try {
        var UserService = require(global.__basedir + "/apps/Services/UserService");
        var userService = new UserService();
        const favoriteIds = await userService.getFavorites(req.userData.email);

        if (favoriteIds && favoriteIds.length > 0) {
            for (let id of favoriteIds) {
                try {
                    const movie = await movieService.getMovie(id);
                    if (movie) {
                        wishlist.push(movie);
                    }
                } catch(err) {}
            }
        }
    } catch(e) {
        console.error("Error fetching favorites:", e);
    }

    
    let watchHistory = [];
    try {
        var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");
        var DatabaseConnection = require(global.__basedir + '/apps/Database/Database');
        var Config = require(global.__basedir + "/Config/Setting.json");
        
        var client = DatabaseConnection.getMongoClient();
        var database = client.db(Config.mongodb.database);
        var userRepo = new UserRepository(database);
        
        const historyIds = await userRepo.getWatchHistory(req.userData.email);
        
        if (historyIds && historyIds.length > 0) {
            
            for (let id of historyIds) {
                try {
                    const movie = await movieService.getMovie(id);
                    if (movie) {
                        watchHistory.push(movie);
                    }
                } catch(err) {
                    console.error("Error fetching movie for history:", id, err);
                }
            }
        }
    } catch(e) {
        console.error("Error fetching watch history:", e);
    }

    res.render("profile", {
        title: "Hồ sơ cá nhân - StreamLine",
        user: req.userData,
        allGenres: allGenres,
        wishlist: wishlist,
        watchHistory: watchHistory
    });
});

module.exports = router;
