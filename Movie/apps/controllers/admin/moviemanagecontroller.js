var express = require("express");

var router = express.Router();
var MovieService = require(global.__basedir + "/apps/Services/MovieService");
var CategoryService = require(global.__basedir + "/apps/Services/CategoryService");
var SeasonService = require(global.__basedir + "/apps/Services/SeasonService");
var ObjectId = require('mongodb').ObjectId;

var Movie = require(global.__basedir + "/apps/Entity/Movie");
var Category = require(global.__basedir + "/apps/Entity/Category");

router.post("/insert-movie", async function (req,res) {
    try {
        var movieService = new MovieService();
        var mov = new Movie();
        mov.adult = req.body.adult === 'true' || req.body.adult === true;
        mov.backdrop_path = req.body.backdrop_path;
        mov.media_type = req.body.media_type || 'movie';
        console.log("DEBUG: Received genre_ids:", req.body.genre_ids);
        if (req.body.genre_ids) {
            
            let ids = Array.isArray(req.body.genre_ids) 
                ? req.body.genre_ids
                : [req.body.genre_ids];
            
            mov.genre_ids = ids.filter(id => id && id !== 'NaN');
        } else {
            mov.genre_ids = [];
        }
        mov.id = parseInt(req.body.id) || 0;
        mov.original_language = req.body.original_language;
        mov.original_title = req.body.original_title;
        mov.overview = req.body.overview;
        mov.popularity = parseFloat(req.body.popularity) || 0;
        mov.poster_path = req.body.poster_path;
        mov.release_date = req.body.release_date;
        mov.title = req.body.title;
        mov.video = req.body.video || "";
        mov.vote_average = parseFloat(req.body.vote_average) || 0;
        mov.vote_count = parseInt(req.body.vote_count) || 0;
        
        try { mov.acting = req.body.acting ? JSON.parse(req.body.acting) : []; } catch(e) { mov.acting = []; }
        try { mov.directing = req.body.directing ? JSON.parse(req.body.directing) : []; } catch(e) { mov.directing = []; }
        try { mov.writing = req.body.writing ? JSON.parse(req.body.writing) : []; } catch(e) { mov.writing = []; }
        
        
        if (req.body.collection_id) {
            mov.belongs_to_collection = {
                id: parseInt(req.body.collection_id),
                name: req.body.collection_name,
                poster_path: req.body.collection_poster_path,
                backdrop_path: req.body.collection_backdrop_path
            };
        } else {
            mov.belongs_to_collection = null;
        }

        
        let seasonsData = null;
        console.log("DEBUG: req.body.seasons:", req.body.seasons);
        if (req.body.seasons) {
            seasonsData = Array.isArray(req.body.seasons) ? req.body.seasons : [req.body.seasons];
        }
        console.log("DEBUG: seasonsData parsed:", seasonsData);
        mov.seasons = []; 

        await movieService.insertMovie(mov);
        
        
        console.log("DEBUG: Checking condition to save seasons:", mov.media_type, seasonsData ? seasonsData.length : 0);
        if (mov.media_type === 'tv' && seasonsData && seasonsData.length > 0) {
            console.log("DEBUG: Saving seasons...");
            var seasonService = new SeasonService();
            
            await seasonService.saveSeasonsForMovie(mov._id, seasonsData);
        } else {
            console.log("DEBUG: Skipping season save");
        }
        res.json({status: true, message: "Thêm phim thành công"});
    } catch (e) {
        console.log(e);
        res.status(500).json({status: false, message: "Lỗi server"});
    }
});

router.get("/", async function(req,res) {
    try {
        var categoryService = new CategoryService();
        var categories = await categoryService.getAllCategories();
        res.render("admin/moviemanage.ejs", { page: 'movies', categories: categories });
    } catch (e) {
        console.log(e);
        res.render("admin/moviemanage.ejs", { page: 'movies', categories: [] });
    }
});

router.get("/movie-list", async function(req,res){
    var movieService = new MovieService();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const keyword = req.query.keyword || '';
    const type = req.query.type || 'all';
    
    var result = await movieService.getMovieList(page, limit, keyword, type);
    res.json(result);
});

router.post("/update-movie", async function(req,res){
    try {
        var movieService = new MovieService();
        var mov = new Movie();
        mov._id = new ObjectId(req.body._id); 
        mov.adult = req.body.adult === 'true' || req.body.adult === true;
        mov.backdrop_path = req.body.backdrop_path;
        mov.media_type = req.body.media_type || 'movie';
        console.log("DEBUG: Received genre_ids (update):", req.body.genre_ids);
        
        if (req.body.genre_ids) {
            
            let ids = Array.isArray(req.body.genre_ids) 
                ? req.body.genre_ids
                : [req.body.genre_ids];
            
            mov.genre_ids = ids.filter(id => id && id !== 'NaN');
        } else {
            mov.genre_ids = [];
        }
        mov.id = parseInt(req.body.id) || 0;
        mov.original_language = req.body.original_language;
        mov.original_title = req.body.original_title;
        mov.overview = req.body.overview;
        mov.popularity = parseFloat(req.body.popularity) || 0;
        mov.poster_path = req.body.poster_path;
        mov.release_date = req.body.release_date;
        mov.title = req.body.title;
        
        mov.video = req.body.video || "";
        mov.trailer = req.body.trailer || "";
        mov.vote_average = parseFloat(req.body.vote_average) || 0;
        mov.vote_count = parseInt(req.body.vote_count) || 0;
        
        try { mov.acting = req.body.acting ? JSON.parse(req.body.acting) : []; } catch(e) { mov.acting = []; }
        try { mov.directing = req.body.directing ? JSON.parse(req.body.directing) : []; } catch(e) { mov.directing = []; }
        try { mov.writing = req.body.writing ? JSON.parse(req.body.writing) : []; } catch(e) { mov.writing = []; }

        
        let seasonsData = null;
        if (req.body.seasons) {
            seasonsData = Array.isArray(req.body.seasons) ? req.body.seasons : [req.body.seasons];
        }
        mov.seasons = []; 

        
        if (req.body.collection_id) {
            mov.belongs_to_collection = {
                id: parseInt(req.body.collection_id),
                name: req.body.collection_name,
                poster_path: req.body.collection_poster_path,
                backdrop_path: req.body.collection_backdrop_path
            };
        } else {
            mov.belongs_to_collection = null;
        }

        await movieService.updateMovie(mov);

        
        if (mov.media_type === 'tv') {
            var seasonService = new SeasonService();
            await seasonService.saveSeasonsForMovie(mov._id, seasonsData);
        }

        res.json({status: true, message: "Cập nhật phim thành công"});
    } catch (e) {
        console.log(e);
        res.status(500).json({status: false, message: "Lỗi server"});
    }
});

router.delete("/delete-movie", async function(req,res){
    var movieService = new MovieService();
    await movieService.deleteMovie(req.query.id);
    res.json({status: true, message:""});
});

router.get("/detail", async function(req, res) {
    var movieService = new MovieService();
    var id = req.query.id;
    var movie = await movieService.getMovie(id);
    
    
    let seasons = [];
    if (movie.media_type === 'tv') {
        var seasonService = new SeasonService();
        seasons = await seasonService.getSeasonsByMovieId(movie._id);
    }

    res.render("admin/moviedetail", { 
        movie: movie, 
        seasons: seasons,
        page: 'movies'
    });
});


router.get("/get-seasons", async function(req, res) {
    try {
        const movieId = req.query.movieId;
        if (!movieId) {
            return res.status(400).json({ status: false, message: "movieId is required", data: [] });
        }
        var seasonService = new SeasonService();
        const seasons = await seasonService.getSeasonsByMovieId(movieId);
        res.json(seasons || []);
    } catch (e) {
        console.log(e);
        res.status(500).json([]);
    }
});

module.exports = router;
