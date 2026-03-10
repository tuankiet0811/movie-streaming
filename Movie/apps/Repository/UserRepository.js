var ObjectId = require('mongodb').ObjectId;

class UserRepository {
    context;
    session;

    constructor(context, session = null) {
        this.context = context;
        this.session = session;
    }

    async insertUser(user) {
        var session = this.session;
        return await this.context.collection("users").insertOne(user, { session });
    }

    async findUserByEmail(email) {
        return await this.context.collection("users").findOne({ email: email });
    }

    async findUserById(id) {
        return await this.context.collection("users").findOne({ _id: new ObjectId(id) });
    }

    async getAllUsers() {
        return await this.context.collection("users").find({}).toArray();
    }

    async countUsers() {
        return await this.context.collection("users").countDocuments();
    }

    async getRecentUsers(limit) {
        return await this.context.collection("users").find({}).sort({ _id: -1 }).limit(limit).toArray();
    }

    async updateLastLogin(email) {
        return await this.context.collection("users").updateOne(
            { email: email },
            { $set: { lastLogin: new Date() } }
        );
    }

    async updateWatchHistory(email, movieId) {
        
        await this.context.collection("users").updateOne(
            { email: email },
            { $pull: { watchHistory: new ObjectId(movieId) } }
        );
        
        
        return await this.context.collection("users").updateOne(
            { email: email },
            { 
                $push: { 
                    watchHistory: {
                        $each: [new ObjectId(movieId)],
                        $position: 0
                    }
                } 
            }
        );
    }

    async getWatchHistory(email) {
        const user = await this.context.collection("users").findOne({ email: email });
        return user && user.watchHistory ? user.watchHistory : [];
    }

    async addFavorite(email, movieId) {
        return await this.context.collection("users").updateOne(
            { email: email },
            { $addToSet: { favorites: new ObjectId(movieId) } }
        );
    }

    async removeFavorite(email, movieId) {
        return await this.context.collection("users").updateOne(
            { email: email },
            { $pull: { favorites: new ObjectId(movieId) } }
        );
    }

    async getFavorites(email) {
        const user = await this.context.collection("users").findOne({ email: email });
        return user && user.favorites ? user.favorites : [];
    }
}

module.exports = UserRepository;
