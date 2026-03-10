var ObjectId = require('mongodb').ObjectId;

class Season {
    _id;
    movie_id; 
    season_number;
    name;
    overview;
    poster_path;
    air_date;
    episodes; 

    constructor() {
        this.episodes = [];
    }
}

module.exports = Season;
