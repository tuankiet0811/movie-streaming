var express = require("express");
var router = express.Router();
var MovieService = require(global.__basedir + "/apps/Services/MovieService");

router.get("/", async function(req, res) {
    try {
        var movieService = new MovieService();
        const page = 1;
        const limit = 10;
        const result = await movieService.getMovieList(page, limit, '', 'all');
        res.render("admin/reviewManage", { page: 'reviews', items: result.data, totalPages: result.totalPages, currentPage: result.page });
    } catch (e) {
        res.render("admin/reviewManage", { page: 'reviews', items: [], totalPages: 0, currentPage: 1 });
    }
});

router.get("/movie-list", async function(req, res) {
    try {
        var movieService = new MovieService();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const keyword = req.query.keyword || '';
        const type = req.query.type || 'all';
        const result = await movieService.getMovieList(page, limit, keyword, type);
        res.json(result);
    } catch(e) {
        res.status(500).json({ status: false });
    }
});

router.get("/ratings", async function(req, res) {
    try {
        const movieId = req.query.movieId;
        if (!movieId) return res.status(400).json([]);
        var movieService = new MovieService();
        const ratings = await movieService.getRatingsForMovie(movieId, 100);
        res.json(ratings || []);
    } catch(e) {
        res.status(500).json([]);
    }
});

router.post("/delete", async function(req, res) {
    try {
        const { movieId, userEmail } = req.body;
        if (!movieId || !userEmail) {
            return res.status(400).json({ status: false, message: "Thiếu thông tin" });
        }
        var movieService = new MovieService();
        const ok = await movieService.deleteRating(movieId, userEmail);
        res.json({ status: ok });
    } catch(e) {
        res.status(500).json({ status: false });
    }
});

module.exports = router;
