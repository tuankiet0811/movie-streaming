var SeasonRepository = require(global.__basedir + "/apps/Repository/SeasonRepository");
var DatabaseConnection = require(global.__basedir + '/apps/Database/Database');
var Config = require(global.__basedir + "/config/setting.json");

class SeasonService {
    constructor() {
        this.client = DatabaseConnection.getMongoClient();
        this.database = this.client.db(Config.mongodb.database);
        this.seasonRepository = new SeasonRepository(this.database);
    }

    async saveSeasonsForMovie(movieId, seasonsData) {
        console.log("DEBUG: saveSeasonsForMovie called for movie", movieId);
        console.log("DEBUG: seasonsData length:", seasonsData ? seasonsData.length : 0);
        
        try {
            await this.client.connect();
            console.log("DEBUG: DB Connected in SeasonService");
        } catch (err) {
            console.error("DEBUG: Failed to connect to DB in SeasonService", err);
        }

        if (!movieId) throw new Error("Movie ID is required");
        
        // First, delete existing seasons for this movie to ensure sync
        console.log("DEBUG: Deleting existing seasons...");
        await this.seasonRepository.deleteSeasonsByMovieId(movieId);

        if (!seasonsData || !Array.isArray(seasonsData) || seasonsData.length === 0) {
            console.log("DEBUG: No seasons data to save");
            return;
        }

        // Insert new seasons
        for (const seasonData of seasonsData) {
            console.log("DEBUG: Processing season", seasonData.season_number);
            const season = {
                movie_id: movieId,
                season_number: parseInt(seasonData.season_number) || 0,
                name: seasonData.name,
                overview: seasonData.overview,
                poster_path: seasonData.poster_path,
                air_date: seasonData.air_date,
                episodes: []
            };

            if (seasonData.episodes && Array.isArray(seasonData.episodes)) {
                season.episodes = seasonData.episodes.map(ep => ({
                    episode_number: parseInt(ep.episode_number) || 0,
                    name: ep.name,
                    overview: ep.overview,
                    still_path: ep.still_path,
                    air_date: ep.air_date,
                    video_url: ep.video_url, 
                    runtime: parseInt(ep.runtime) || 0,
                    vote_average: parseFloat(ep.vote_average) || 0,
                    vote_count: parseInt(ep.vote_count) || 0
                }));
            }

            console.log("DEBUG: Inserting season...", season);
            await this.seasonRepository.insertSeason(season);
            console.log("DEBUG: Season inserted");
        }
    }


    async getSeasonsByMovieId(movieId) {
        return await this.seasonRepository.getSeasonsByMovieId(movieId);
    }
}

module.exports = SeasonService;
