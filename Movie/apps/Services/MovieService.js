var DatabaseConnection = require(global.__basedir + '/apps/Database/Database');
var Config = require( global.__basedir + "/config/setting.json");
var MovieRepository = require(global.__basedir + "/apps/Repository/MovieRepository");
var CategoryRepository = require(global.__basedir + "/apps/Repository/CategoryRepository");
var NotificationRepository = require(global.__basedir + "/apps/Repository/NotificationRepository");
var UserRepository = require(global.__basedir + "/apps/Repository/UserRepository");

class MovieService{
    movieRepository;
    categoryRepository;
    notificationRepository;
    userRepository;
    constructor(){
        this.client = DatabaseConnection.getMongoClient();
        this.database = this.client.db(Config.mongodb.database);
        this.movieRepository = new MovieRepository(this.database);
        this.categoryRepository = new CategoryRepository(this.database);
        this.notificationRepository = new NotificationRepository(this.database);
        this.userRepository = new UserRepository(this.database);
    }
    async ensureConnected(){
        try {
            await this.client.connect();
        } catch(e) {}
    }
    async insertMovie(movie){
        await this.ensureConnected();
        const session = this.client.startSession();
        session.startTransaction();
        try{
            this.movieRepository.session = session;
            await this.movieRepository.insertMovie(movie);
            await session.commitTransaction();
            await session.endSession();
            try {
                const users = await this.userRepository.getAllUsers();
                if (users && users.length > 0) {
                    const now = new Date();
                    for (let u of users) {
                        const notif = {
                            recipientEmail: u.email,
                            senderEmail: "admin@system",
                            senderName: "Admin",
                            type: "NEW_MOVIE",
                            movieId: movie._id,
                            movieTitle: movie.title || movie.original_title || "",
                            moviePoster: movie.poster_path || "",
                            content: "Đã có phim mới",
                            isRead: false,
                            createdAt: now
                        };
                        const res = await this.notificationRepository.createNotification(notif);
                        try {
                            if (global.__io) {
                                global.__io.to(u.email).emit("notification", Object.assign({}, notif, { _id: res.insertedId }));
                            }
                        } catch (emitErr) {}
                    }
                }
            } catch(e) {}
            return true;
        }catch(error){
            await session.abortTransaction();
            await session.endSession();
            return false;
        }

    }
    async deleteMovie(id){
        await this.ensureConnected();
        const session = this.client.startSession();
        session.startTransaction();
        this.movieRepository.session = session;
        var result = await this.movieRepository.deleteMovie(id);
        await session.commitTransaction();
        await session.endSession();
        return result;
    }
    async updateMovie(movie){
        await this.ensureConnected();
        const session = this.client.startSession();
        session.startTransaction();
        this.movieRepository.session = session;
        var result = await this.movieRepository.updateMovie(movie);
        await session.commitTransaction();
        await session.endSession();
        return result;
    }
    async getMovie(id){
        await this.ensureConnected();
        return await this.movieRepository.getMovie(id);
    }
    async getMovieList(page, limit, keyword, type){
         await this.ensureConnected();
         const skip = (page - 1) * limit;
         
         let filter = {};
         
         
         if (type && type !== 'all') {
             filter.media_type = type;
         }

         
         if (keyword && keyword.trim() !== '') {
             const regex = new RegExp(keyword, 'i'); 
             filter.$or = [
                 { title: regex },
                 { original_title: regex }
             ];
         }

         const data = await this.movieRepository.getMovieList(skip, limit, filter);
         const total = await this.movieRepository.countMovies(filter);
         return {
             data: data,
             total: total,
             page: page,
             limit: limit,
             totalPages: Math.ceil(total / limit)
         };
    }

    async getAllGenres() {
        await this.ensureConnected();
        return await this.categoryRepository.getAllCategories();
    }

    async getDiscoverMovies(page, limit, genres, minRating, year, mediaType, country, keyword) {
        await this.ensureConnected();
        const skip = (page - 1) * limit;
        let filter = {};
        let collation = null;

        
        if (keyword && keyword.trim() !== '') {
            
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            const fuzzyKeyword = escapedKeyword.split('').join('\\s*');
            const regex = new RegExp(fuzzyKeyword, 'i');
            
            filter.$or = [
                { title: regex },
                { original_title: regex },
                { name: regex }, 
                { original_name: regex }
            ];
            collation = { locale: "vi", strength: 1 };
        }

        
        if (genres && genres.length > 0) {
            
             filter.genre_ids = { $all: genres };
        }

        
        if (minRating) {
            filter.vote_average = { $gte: parseFloat(minRating) };
        }

        
        if (year) {
             
             filter.release_date = { $regex: `^${year}` };
        }

        
        if (mediaType && mediaType !== 'all') {
            filter.media_type = mediaType;
        }

        
        if (country && country !== 'all') {
            filter.original_language = country;
        }

        const data = await this.movieRepository.getMovieList(skip, limit, filter, collation);
        const total = await this.movieRepository.countMovies(filter);

        return {
            data: data,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getLatestMovie() {
        await this.ensureConnected();
        const movies = await this.movieRepository.getMovieList(0, 1);
        return movies.length > 0 ? movies[0] : null;
    }
    async getTopPopularMovies(limit) {
        await this.ensureConnected();
        const movies = await this.movieRepository.getPopularMovies(0, limit, {});
        return movies;
    }
    async getMostPopularMovie() {
        await this.ensureConnected();
        const movies = await this.movieRepository.getPopularMovies(0, 1, {});
        return movies.length > 0 ? movies[0] : null;
    }
    async getTopPopularHorrorMovies(limit) {
        await this.ensureConnected();
        const genres = await this.categoryRepository.getAllCategories();
        let horror = null;
        if (genres && Array.isArray(genres)) {
            horror = genres.find(g => /kinh dị|horror/i.test(g.Name));
        }
        if (!horror) {
            return [];
        }
        const movies = await this.movieRepository.getPopularMoviesByGenre(horror._id, 0, limit);
        return movies;
    }
    async getTopPopularMoviesByGenreId(genreId, limit) {
        await this.ensureConnected();
        const movies = await this.movieRepository.getPopularMoviesByGenre(genreId, 0, limit);
        return movies;
    }
    async getTopPopularMoviesByLanguage(language, limit) {
        await this.ensureConnected();
        const movies = await this.movieRepository.getPopularMoviesByLanguage(language, 0, limit);
        return movies;
    }
    async getRandomMovies(limit) {
        await this.ensureConnected();
        return await this.movieRepository.getRandomMovies(limit);
    }
    async searchMovies(keyword, limit = 5) {
        await this.ensureConnected();
        if (!keyword || keyword.trim() === '') {
            return [];
        }
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKeyword, 'i');
        const filter = {
            $or: [
                { title: regex },
                { original_title: regex },
                { name: regex },
                { original_name: regex }
            ]
        };
        const collation = { locale: "vi", strength: 1 };
        const movies = await this.movieRepository.getMovieList(0, limit, filter, collation);
        return movies;
    }

    
    async rateMovie(movieId, userEmail, rating, comment) {
        await this.ensureConnected();
        try {
            
            const existingReview = await this.movieRepository.getReview(movieId, userEmail);
            if (existingReview) {
                const diff = Date.now() - new Date(existingReview.createdAt).getTime();
                if (diff > 24 * 60 * 60 * 1000) {
                    throw new Error("Không thể sửa đánh giá sau 24 giờ.");
                }
            }

            await this.movieRepository.upsertRating(movieId, userEmail, rating, comment);
            const stats = await this.movieRepository.getRatingStats(movieId);
            
            const session = this.client.startSession();
            session.startTransaction();
            this.movieRepository.session = session;
            await session.commitTransaction();
            await session.endSession();
            
            return {
                stats: stats,
                review: {
                    movieId,
                    userEmail,
                    rating,
                    comment,
                    updatedAt: new Date()
                }
            };
        } catch (error) {
            const session = this.movieRepository.session;
            if (session) {
                await session.abortTransaction();
                await session.endSession();
            }
            throw error;
        }
    }

    async getRatingStats(movieId) {
        await this.ensureConnected();
        return await this.movieRepository.getRatingStats(movieId);
    }

    async getUserRating(movieId, userEmail) {
        await this.ensureConnected();
        return await this.movieRepository.getUserRating(movieId, userEmail);
    }

    async getRatingsForMovie(movieId, limit = 20) {
        await this.ensureConnected();
        return await this.movieRepository.getRatingsForMovie(movieId, limit);
    }

    async deleteRating(movieId, reviewUserEmail) {
        await this.ensureConnected();
        try {
            const session = this.client.startSession();
            session.startTransaction();
            this.movieRepository.session = session;
            const result = await this.movieRepository.deleteRating(movieId, reviewUserEmail);
            await session.commitTransaction();
            await session.endSession();
            return result;
        } catch (error) {
            const session = this.movieRepository.session;
            if (session) {
                await session.abortTransaction();
                await session.endSession();
            }
            throw error;
        }
    }

    async toggleLike(movieId, reviewUserEmail, likerEmail, likerName) {
        await this.ensureConnected();
        try {
            const session = this.client.startSession();
            session.startTransaction();
            this.movieRepository.session = session;
            const result = await this.movieRepository.toggleLike(movieId, reviewUserEmail, likerEmail);
            await session.commitTransaction();
            await session.endSession();

            if (result && result.isLiked && reviewUserEmail !== likerEmail) {
                try {
                    const notif = {
                        recipientEmail: reviewUserEmail,
                        senderEmail: likerEmail,
                        senderName: likerName,
                        type: 'LIKE_REVIEW',
                        movieId: movieId,
                        content: `${likerName} đã thích đánh giá của bạn`,
                        isRead: false,
                        createdAt: new Date()
                    };
                    const res = await this.notificationRepository.createNotification(notif);
                    try {
                        if (global.__io) {
                            global.__io.to(reviewUserEmail).emit("notification", Object.assign({}, notif, { _id: res.insertedId }));
                        }
                    } catch (emitErr) {}
                } catch(e) { console.error("Notification error:", e); }
            }

            return result;
        } catch (error) {
            const session = this.movieRepository.session;
            if (session) {
                await session.abortTransaction();
                await session.endSession();
            }
            throw error;
        }
    }

    async toggleLikeReply(movieId, reviewUserEmail, replyId, likerEmail, likerName) {
        await this.ensureConnected();
        try {
            const session = this.client.startSession();
            session.startTransaction();
            this.movieRepository.session = session;
            const result = await this.movieRepository.toggleLikeReply(movieId, reviewUserEmail, replyId, likerEmail);
            await session.commitTransaction();
            await session.endSession();

            if (result && result.isLiked && result.replyUserEmail && result.replyUserEmail !== likerEmail) {
                 try {
                    const notif = {
                        recipientEmail: result.replyUserEmail,
                        senderEmail: likerEmail,
                        senderName: likerName,
                        type: 'LIKE_REPLY',
                        movieId: movieId,
                        content: `${likerName} đã thích bình luận của bạn`,
                        isRead: false,
                        createdAt: new Date()
                    };
                    const res = await this.notificationRepository.createNotification(notif);
                    try {
                        if (global.__io) {
                            global.__io.to(result.replyUserEmail).emit("notification", Object.assign({}, notif, { _id: res.insertedId }));
                        }
                    } catch (emitErr) {}
                } catch(e) { console.error("Notification error:", e); }
            }

            return result;
        } catch (error) {
            const session = this.movieRepository.session;
            if (session) {
                await session.abortTransaction();
                await session.endSession();
            }
            throw error;
        }
    }

    async addReply(movieId, reviewUserEmail, replyUserEmail, replyUserName, content) {
        await this.ensureConnected();
        try {
            const replyObj = {
                userEmail: replyUserEmail,
                content: content,
                createdAt: new Date(),
                likes: []
            };
            const session = this.client.startSession();
            session.startTransaction();
            this.movieRepository.session = session;
            const result = await this.movieRepository.addReply(movieId, reviewUserEmail, replyObj);
            await session.commitTransaction();
            await session.endSession();

            if (reviewUserEmail !== replyUserEmail) {
                 try {
                    const notif = {
                        recipientEmail: reviewUserEmail,
                        senderEmail: replyUserEmail,
                        senderName: replyUserName,
                        type: 'REPLY_REVIEW',
                        movieId: movieId,
                        content: `đã trả lời đánh giá của bạn: ${content}`,
                        isRead: false,
                        createdAt: new Date()
                    };
                    const res = await this.notificationRepository.createNotification(notif);
                    try {
                        if (global.__io) {
                            global.__io.to(reviewUserEmail).emit("notification", Object.assign({}, notif, { _id: res.insertedId }));
                        }
                    } catch (emitErr) {}
                } catch(e) { console.error("Notification error:", e); }
            }
            
            
            const mentionMatch = content.match(/@(\S+)/);
            if (mentionMatch && mentionMatch[1]) {
                const taggedEmail = mentionMatch[1];
                if (taggedEmail !== reviewUserEmail && taggedEmail !== replyUserEmail) {
                     try {
                        const notif = {
                            recipientEmail: taggedEmail,
                            senderEmail: replyUserEmail,
                            senderName: replyUserName,
                            type: 'REPLY_REPLY',
                            movieId: movieId,
                            content: `User đã nhắc đến bạn trong một bình luận: ${content}`,
                            isRead: false,
                            createdAt: new Date()
                        };
                        const res = await this.notificationRepository.createNotification(notif);
                        try {
                            if (global.__io) {
                                global.__io.to(taggedEmail).emit("notification", Object.assign({}, notif, { _id: res.insertedId }));
                            }
                        } catch (emitErr) {}
                    } catch(e) { console.error("Notification error:", e); }
                }
            }

            return result;
        } catch (error) {
            const session = this.movieRepository.session;
            if (session) {
                await session.abortTransaction();
                await session.endSession();
            }
            throw error;
        }
    }

    async editReply(movieId, reviewUserEmail, replyId, replyUserEmail, content) {
        await this.ensureConnected();
        try {
            
            const reply = await this.movieRepository.getReply(movieId, reviewUserEmail, replyId);
            if (reply) {
                const diff = Date.now() - new Date(reply.createdAt).getTime();
                if (diff > 24 * 60 * 60 * 1000) {
                    throw new Error("Không thể sửa phản hồi sau 24 giờ.");
                }
            }

            const session = this.client.startSession();
            session.startTransaction();
            this.movieRepository.session = session;
            const success = await this.movieRepository.updateReply(movieId, reviewUserEmail, replyId, replyUserEmail, content);
            await session.commitTransaction();
            await session.endSession();
            return success;
        } catch (error) {
            const session = this.movieRepository.session;
            if (session) {
                await session.abortTransaction();
                await session.endSession();
            }
            throw error;
        }
    }
}
module.exports = MovieService;
