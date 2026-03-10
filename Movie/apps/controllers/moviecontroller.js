var express = require("express");
var router = express.Router();
var MovieService = require(global.__basedir + "/apps/Services/MovieService");
var jsonwebtoken = require('jsonwebtoken');
var config = require(global.__basedir + '/Config/Setting.json');
var SeasonService = require(global.__basedir + "/apps/Services/SeasonService");
var verifyWebToken = require("../Util/VerifyWebToken");

router.get("/", async function(req, res) {
    var movieService = new MovieService();
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    
    var result = await movieService.getMovieList(page, limit);
    
    
    let ratingStatsMap = {};
    try {
        if (result && Array.isArray(result.data)) {
            for (const m of result.data) {
                try {
                    const rs = await movieService.getRatingStats(m._id);
                    ratingStatsMap[m._id] = rs;
                } catch(e) {}
            }
        }
    } catch(e) {}
    let allGenres = [];
    try {
        allGenres = await movieService.getAllGenres();
    } catch(e) {}
    
    let similarMovies = [];
    try {
        similarMovies = await movieService.getRandomMovies(5);
    } catch(e) {}
    
    let user = null;
    let token = req.cookies ? req.cookies.token : null;
    if (token) {
        try {
            const decoded = jsonwebtoken.verify(token, config.jwt.secret);
            user = {
                user: decoded.user,
                email: decoded.user,
                role: decoded.role,
                name: decoded.name
            };
        } catch (err) {}
    }
    
    res.render("movie", { 
        title: "Danh sách phim",
        items: result.data,
        totalPages: result.totalPages,
        currentPage: result.page,
        allGenres: allGenres,
        user: user,
        ratingStatsMap: ratingStatsMap
    });
});

router.get("/detail", async function(req, res) {
    var movieService = new MovieService();
    var id = req.query.id;
    var movie = await movieService.getMovie(id);
    
    let seasons = [];
    if (movie && movie.media_type === 'tv') {
        try {
            var seasonService = new SeasonService();
            seasons = await seasonService.getSeasonsByMovieId(movie._id);
        } catch(e) {}
    }
    
    let allGenres = [];
    try {
        allGenres = await movieService.getAllGenres();
    } catch(e) {}

    let similarMovies = [];
    try {
        similarMovies = await movieService.getRandomMovies(5);
    } catch(e) {}
    
    let user = null;
    let token = req.cookies ? req.cookies.token : null;
    if (token) {
        try {
            const decoded = jsonwebtoken.verify(token, config.jwt.secret);
            user = {
                user: decoded.user,
                email: decoded.user,
                role: decoded.role,
                name: decoded.name
            };
        } catch (err) {}
    }
    
    
    let ratingStats = { average: 0, count: 0 };
    let userRating = null;
    try {
        ratingStats = await movieService.getRatingStats(movie._id);
        if (user && user.email) {
            userRating = await movieService.getUserRating(movie._id, user.email);
        }
    } catch(e) {}
    
    
    let ratings = [];
    try {
        ratings = await movieService.getRatingsForMovie(movie._id, 20);
    } catch(e) {}
    
    
    let isFavorite = false;
    if (user && user.email) {
        try {
            var UserService = require(global.__basedir + "/apps/Services/UserService");
            var userService = new UserService();
            var favorites = await userService.getFavorites(user.email);
            isFavorite = favorites.some(favId => favId.toString() === movie._id.toString());
        } catch(e) {}
    }

    res.render("moviedetail", { movie: movie, seasons: seasons, allGenres: allGenres, user: user, similarMovies: similarMovies, ratingStats: ratingStats, userRating: userRating, ratings: ratings, isFavorite: isFavorite });
});

router.post("/favorite/toggle", verifyWebToken, async function(req, res) {
    try {
        const { movieId } = req.body;
        if (!movieId) {
            return res.status(400).json({ status: false, message: "Thiếu movieId" });
        }
        
        var UserService = require(global.__basedir + "/apps/Services/UserService");
        var userService = new UserService();
        const result = await userService.toggleFavorite(req.userData.email, movieId);
        
        res.json({ status: true, isFavorite: result.isFavorite });
    } catch (e) {
        console.error("Favorite toggle error:", e);
        res.status(500).json({ status: false, message: "Lỗi server" });
    }
});

router.get("/watch", async function(req, res) {
    var movieService = new MovieService();
    var seasonService = new SeasonService();
    var id = req.query.id;
    var movie = await movieService.getMovie(id);
    
    let seasons = [];
    if (movie && movie.media_type === 'tv') {
        try {
            seasons = await seasonService.getSeasonsByMovieId(movie._id);
        } catch(e) {}
    }
    
    let user = null;
    let token = req.cookies ? req.cookies.token : null;
    if (token) {
        try {
            const decoded = jsonwebtoken.verify(token, config.jwt.secret);
            user = {
                user: decoded.user,
                email: decoded.user,
                role: decoded.role,
                name: decoded.name
            };

            
            try {
                var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");
                var DatabaseConnection = require(global.__basedir + '/apps/Database/Database');
                var Config = require(global.__basedir + "/Config/Setting.json");
                
                var client = DatabaseConnection.getMongoClient();
                var database = client.db(Config.mongodb.database);
                var userRepo = new UserRepository(database);
                await userRepo.updateWatchHistory(user.email, movie._id);
            } catch(histErr) {
                console.error("Error updating watch history:", histErr);
            }
        } catch (err) {}
    }
    
    let allGenres = [];
    try {
        allGenres = await movieService.getAllGenres();
    } catch(e) {}
    
    let similarMovies = [];
    try {
        similarMovies = await movieService.getRandomMovies(5);
    } catch(e) {}

    res.render("watch", { 
        movie: movie, 
        seasons: seasons, 
        allGenres: allGenres, 
        user: user,
        currentSeason: req.query.season,
        currentEpisode: req.query.episode,
        similarMovies: similarMovies
    });
});


router.post("/rate", verifyWebToken, async function(req, res) {
    try {
        const { movieId, rating, comment } = req.body;
        if (!movieId || rating == null) {
            return res.status(400).json({ status: false, message: "Thiếu movieId hoặc rating" });
        }
        const value = parseFloat(rating);
        if (isNaN(value) || value < 1 || value > 10) {
            return res.status(400).json({ status: false, message: "Rating phải từ 1 đến 10" });
        }
        var movieService = new MovieService();
        const result = await movieService.rateMovie(movieId, req.userData.email, value, comment);
        res.json({ status: true, message: "Đã lưu đánh giá", stats: result.stats, review: result.review });
    } catch (e) {
        console.error("Rate movie error:", e);
        res.status(500).json({ status: false, message: "Lỗi server" });
    }
});


router.post("/review/like", verifyWebToken, async function(req, res) {
    try {
        const { movieId, reviewUserEmail } = req.body;
        if (!movieId || !reviewUserEmail) {
            return res.status(400).json({ status: false, message: "Thiếu thông tin" });
        }
        var movieService = new MovieService();
        const result = await movieService.toggleLike(movieId, reviewUserEmail, req.userData.email, req.userData.name);
        res.json({ status: true, data: result });
    } catch (e) {
        console.error("Like error:", e);
        res.status(500).json({ status: false, message: "Lỗi server" });
    }
});


router.post("/review/reply/like", verifyWebToken, async function(req, res) {
    try {
        const { movieId, reviewUserEmail, replyId } = req.body;
        if (!movieId || !reviewUserEmail || !replyId) {
            return res.status(400).json({ status: false, message: "Thiếu thông tin" });
        }
        var movieService = new MovieService();
        const result = await movieService.toggleLikeReply(movieId, reviewUserEmail, replyId, req.userData.email, req.userData.name);
        res.json({ status: true, data: result });
    } catch (e) {
        console.error("Like Reply error:", e);
        res.status(500).json({ status: false, message: "Lỗi server" });
    }
});


router.post("/review/reply", verifyWebToken, async function(req, res) {
    try {
        const { movieId, reviewUserEmail, content } = req.body;
        if (!movieId || !reviewUserEmail || !content) {
            return res.status(400).json({ status: false, message: "Thiếu thông tin" });
        }
        var movieService = new MovieService();
        const replies = await movieService.addReply(movieId, reviewUserEmail, req.userData.email, req.userData.name, content);
        res.json({ status: true, replies: replies });
    } catch (e) {
        console.error("Reply error:", e);
        res.status(500).json({ status: false, message: "Lỗi server" });
    }
});


router.post("/review/edit", verifyWebToken, async function(req, res) {
    try {
        const { movieId, rating, comment } = req.body;
        if (!movieId || !rating) {
             return res.status(400).json({ status: false, message: "Thiếu thông tin" });
        }
        var movieService = new MovieService();
        const result = await movieService.rateMovie(movieId, req.userData.email, rating, comment);
        res.json({ status: true, data: result });
    } catch (e) {
        console.error("Edit Review error:", e);
        res.status(500).json({ status: false, message: "Lỗi server" });
    }
});


router.post("/review/reply/edit", verifyWebToken, async function(req, res) {
    try {
        const { movieId, reviewUserEmail, replyId, content } = req.body;
        if (!movieId || !reviewUserEmail || !replyId || !content) {
            return res.status(400).json({ status: false, message: "Thiếu thông tin" });
        }
        var movieService = new MovieService();
        const success = await movieService.editReply(movieId, reviewUserEmail, replyId, req.userData.email, content);
        if (success) {
             res.json({ status: true });
        } else {
             res.json({ status: false, message: "Không thể sửa phản hồi" });
        }
    } catch (e) {
        console.error("Edit Reply error:", e);
        res.status(500).json({ status: false, message: "Lỗi server" });
    }
});

module.exports = router;
