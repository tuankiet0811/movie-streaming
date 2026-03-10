var express = require("express");
var router = express.Router();
var verifyWebToken = require("../Util/VerifyWebToken");
var MovieService = require("../Services/MovieService");

router.get("/", verifyWebToken, async function (req, res) {
    var movieService = new MovieService();
    var latestMovie = await movieService.getMostPopularMovie();
    let latestRatingStats = { average: 0, count: 0 };
    try {
        if (latestMovie && latestMovie._id) {
            latestRatingStats = await movieService.getRatingStats(latestMovie._id);
        }
    } catch(e) {}
    var trendingMovies = await movieService.getTopPopularMovies(12);
    
    
    function normalizeVN(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }
    
    
    const allGenres = await movieService.getAllGenres();
    let horrorGenre = allGenres.find(g => normalizeVN(g.Name).includes(normalizeVN('Kinh Dị')) || /horror/i.test(g.Name));
    let animationGenre = allGenres.find(g => normalizeVN(g.Name).includes(normalizeVN('Hoạt Hình')) || /animation/i.test(g.Name));
    
    var popularHorrorMovies = [];
    if (horrorGenre) {
        
        popularHorrorMovies = await movieService.getTopPopularMoviesByGenreId(horrorGenre._id, 12);
    }
    
    var popularKoreanMovies = await movieService.getTopPopularMoviesByLanguage('ko', 12);
    var popularAnimationMovies = [];
    if (animationGenre) {
        popularAnimationMovies = await movieService.getTopPopularMoviesByGenreId(animationGenre._id, 12);
    }
    
    
    let ratingStatsMap = {};
    try {
        const collect = (arr) => {
            if (arr && Array.isArray(arr)) {
                return arr.map(m => m._id).filter(Boolean);
            }
            return [];
        };
        const ids = [
            ...collect(trendingMovies),
            ...collect(popularHorrorMovies),
            ...collect(popularKoreanMovies),
            ...collect(popularAnimationMovies)
        ];
        for (const id of ids) {
            try {
                const rs = await movieService.getRatingStats(id);
                ratingStatsMap[id] = rs;
            } catch(e) {}
        }
    } catch(e) {}
    
    res.render("home", { 
        title: "Trang Chủ - StreamLine",
        user: req.userData,
        latestMovie: latestMovie,
        latestRatingStats: latestRatingStats,
        allGenres: allGenres,
        trendingMovies: trendingMovies,
        popularHorrorMovies: popularHorrorMovies,
        popularKoreanMovies: popularKoreanMovies,
        popularAnimationMovies: popularAnimationMovies,
        ratingStatsMap: ratingStatsMap
    });
});

router.get("/discover", verifyWebToken, async function (req, res) {
    var movieService = new MovieService();
    
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    
    let genres = req.query.genres || [];
    if (!Array.isArray(genres) && genres) {
        genres = [genres];
    }
    
    const minRating = req.query.rating || 0;
    const year = req.query.year || '';
    const mediaType = req.query.mediaType || 'all';
    const country = req.query.country || 'all';
    const keyword = req.query.keyword || '';

    const allGenres = await movieService.getAllGenres();
    const result = await movieService.getDiscoverMovies(page, limit, genres, minRating, year, mediaType, country, keyword);

    let ratingStatsMap = {};
    try {
        if (result && result.data && Array.isArray(result.data)) {
            for (const item of result.data) {
                try {
                    if (item && item._id) {
                        const rs = await movieService.getRatingStats(item._id);
                        ratingStatsMap[item._id] = rs;
                    }
                } catch(e) {}
            }
        }
    } catch(e) {}

    res.render("discover", {
        title: "Khám phá - StreamLine",
        user: req.userData,
        items: result.data,
        totalPages: result.totalPages,
        currentPage: result.page,
        allGenres: allGenres,
        selectedGenres: genres,
        selectedRating: minRating,
        selectedYear: year,
        selectedMediaType: mediaType,
        selectedCountry: country,
        selectedKeyword: keyword,
        totalItems: result.total,
        ratingStatsMap: ratingStatsMap
    });
});

router.get("/api/search-suggestions", async function (req, res) {
    try {
        const keyword = req.query.q;
        if (!keyword) {
            return res.json([]);
        }
        
        var movieService = new MovieService();
        const movies = await movieService.searchMovies(keyword, 5);
        
        const suggestions = movies.map(movie => ({
            _id: movie._id,
            title: movie.title || movie.name,
            original_title: movie.original_title || movie.original_name,
            poster_path: movie.poster_path,
            release_date: movie.release_date || movie.first_air_date,
            media_type: movie.media_type,
            vote_average: movie.vote_average,
            adult: movie.adult
        }));
        
        res.json(suggestions);
    } catch (error) {
        console.error("Search API Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



module.exports = router;
