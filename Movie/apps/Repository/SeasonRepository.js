var ObjectId = require('mongodb').ObjectId;

class SeasonRepository {
    constructor(db) {
        this.db = db;
        this.collectionName = "seasons";
    }

    async insertSeason(season) {
        var collection = this.db.collection(this.collectionName);
        if (!season._id) {
            season._id = new ObjectId();
        }
        
        if (season.movie_id && typeof season.movie_id === 'string') {
            season.movie_id = new ObjectId(season.movie_id);
        }
        await collection.insertOne(season);
        return season;
    }

    async deleteSeasonsByMovieId(movieId) {
        var collection = this.db.collection(this.collectionName);
        
        var mId = (typeof movieId === 'string') ? new ObjectId(movieId) : movieId;
        await collection.deleteMany({ movie_id: mId });
    }

    async getSeasonsByMovieId(movieId) {
        var collection = this.db.collection(this.collectionName);
        var mId = (typeof movieId === 'string') ? new ObjectId(movieId) : movieId;
        return await collection.find({ movie_id: mId }).sort({ season_number: 1 }).toArray();
    }
}

module.exports = SeasonRepository;
