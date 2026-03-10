var ObjectId = require('mongodb').ObjectId;
class MovieRepository {
  context;
  session;
  constructor(context, session = null) {
    this.context = context;
    this.session = session;
  }
  async insertMovie(movie) {
    var session = this.session;
    return await
      this.context.collection("movie").insertOne(movie, { session });
  }
  async updateMovie(movie) {
    var session = this.session;
    return await this.context.collection("movie").updateOne({
      "_id": new
        ObjectId(movie._id)
    }, { $set: movie }, { session });
  }
  async deleteMovie(id) {
    var session = this.session;
    return await this.context.collection("movie").deleteOne({
      "_id": new
        ObjectId(id)
    }, { session });
  }
  async getMovie(id) {
    return await this.context.collection("movie").findOne({
      "_id": new
        ObjectId(id)
    });
  }
  async getMovieList(skip, take, filter = {}, collation = null) {
    let cursor = this.context.collection("movie").find(filter);
    if (collation) {
      cursor = cursor.collation(collation);
    }
    cursor = cursor.sort({ _id: -1 }).skip(skip).limit(take);
    return await cursor.toArray();
  }

  async countMovies() {
    return await this.context.collection("movie").countDocuments();
  }
  
  async getTotalViews() {
      const result = await this.context.collection("movie").aggregate([
          { $group: { _id: null, total: { $sum: "$popularity" } } }
      ]).toArray();
      return result.length > 0 ? Math.round(result[0].total) : 0;
  }
  
  async getAverageRating() {
      const result = await this.context.collection("movie").aggregate([
          { $group: { _id: null, avg: { $avg: "$vote_average" } } }
      ]).toArray();
      return result.length > 0 ? parseFloat(result[0].avg.toFixed(1)) : 0;
  }

  async getRandomMovies(take) {
    const cursor = await this.context.collection("movie").aggregate([
      { $sample: { size: take } }
    ]);
    return await cursor.toArray();
  }
  async getPopularMovies(skip, take, filter = {}) {
    const cursor = await this.context.collection("movie").find(filter).sort({ popularity: -1 }).skip(skip).limit(take);
    return await cursor.toArray();
  }
  async getPopularMoviesByGenre(genreId, skip, take) {
    let ids = [];
    
    ids.push(genreId);
    
    try { ids.push(genreId.toString()); } catch (e) { }
    
    try { ids.push(new ObjectId(genreId)); } catch (e) { }
    
    const asNum = parseInt(genreId);
    if (!isNaN(asNum)) {
      ids.push(asNum);
      ids.push(asNum.toString());
    }
    const cursor = await this.context.collection("movie")
      .find({ genre_ids: { $in: ids } })
      .sort({ popularity: -1 })
      .skip(skip)
      .limit(take);
    return await cursor.toArray();
  }
  async getPopularMoviesByLanguage(language, skip, take) {
    const cursor = await this.context.collection("movie")
      .find({ original_language: language })
      .sort({ popularity: -1 })
      .skip(skip)
      .limit(take);
    return await cursor.toArray();
  }
  async countMovies(filter = {}) {
    return await this.context.collection("movie").countDocuments(filter);
  }

  
  async upsertRating(movieId, userEmail, rating, comment) {
    await this.context.collection("ratings").updateOne(
      { movieId: new ObjectId(movieId), userEmail: userEmail },
      { 
        $set: { 
          movieId: new ObjectId(movieId),
          userEmail: userEmail,
          rating: parseFloat(rating),
          comment: comment || "",
          updatedAt: new Date()
        },
        $setOnInsert: { 
          createdAt: new Date(),
          likes: [],
          replies: []
        }
      },
      { upsert: true, session: this.session }
    );
    return true;
  }

  async getRatingStats(movieId) {
    const cursor = await this.context.collection("ratings").aggregate([
      { $match: { movieId: new ObjectId(movieId) } },
      { $group: { _id: "$movieId", avg: { $avg: "$rating" }, count: { $sum: 1 } } }
    ], { session: this.session });
    const arr = await cursor.toArray();
    if (arr.length === 0) {
      return { average: 0, count: 0 };
    }
    return { average: parseFloat(arr[0].avg.toFixed(1)), count: arr[0].count };
  }

  async getUserRating(movieId, userEmail) {
    if (!userEmail) return null;
    const doc = await this.context.collection("ratings").findOne({ movieId: new ObjectId(movieId), userEmail: userEmail });
    return doc ? doc.rating : null;
  }

  async getReview(movieId, userEmail) {
    return await this.context.collection("ratings").findOne({ 
        movieId: new ObjectId(movieId), 
        userEmail: userEmail 
    });
  }

  async getReply(movieId, reviewUserEmail, replyId) {
    const doc = await this.context.collection("ratings").findOne({
        movieId: new ObjectId(movieId),
        userEmail: reviewUserEmail,
        "replies._id": new ObjectId(replyId)
    });
    
    if (doc && doc.replies) {
        return doc.replies.find(r => r._id.toString() === replyId.toString());
    }
    return null;
  }

  async getRatingsForMovie(movieId, limit = 20) {
    const cursor = await this.context.collection("ratings")
      .find({ movieId: new ObjectId(movieId) })
      .sort({ updatedAt: -1 })
      .limit(limit);
    let ratings = await cursor.toArray();

    
    for (let r of ratings) {
      if (r.replies && r.replies.length > 0) {
        let modified = false;
        r.replies = r.replies.map(rep => {
          if (!rep._id || !rep.likes) {
             if (!rep._id) rep._id = new ObjectId();
             if (!rep.likes) rep.likes = [];
             modified = true;
          }
          return rep;
        });
        
        if (modified) {
          
          try {
             await this.context.collection("ratings").updateOne(
              { _id: r._id },
              { $set: { replies: r.replies } }
            );
          } catch(e) {
            console.error("Auto-fix replies error:", e);
          }
        }
      }
    }

    return ratings;
  }

  async toggleLike(movieId, reviewUserEmail, likerEmail) {
    const filter = { movieId: new ObjectId(movieId), userEmail: reviewUserEmail };
    const doc = await this.context.collection("ratings").findOne(filter, { session: this.session });
    if (!doc) return null;

    let likes = doc.likes || [];
    let isLiked = false;
    
    
    const index = likes.indexOf(likerEmail);
    if (index > -1) {
      
      await this.context.collection("ratings").updateOne(filter, {
        $pull: { likes: likerEmail }
      }, { session: this.session });
      isLiked = false;
    } else {
      
      await this.context.collection("ratings").updateOne(filter, {
        $addToSet: { likes: likerEmail }
      }, { session: this.session });
      isLiked = true;
    }
    
    
    const updatedDoc = await this.context.collection("ratings").findOne(filter, { session: this.session });
    return {
      likesCount: (updatedDoc.likes || []).length,
      isLiked: isLiked
    };
  }

  async toggleLikeReply(movieId, reviewUserEmail, replyId, likerEmail) {
    const filter = { 
      movieId: new ObjectId(movieId), 
      userEmail: reviewUserEmail,
      "replies._id": new ObjectId(replyId)
    };
    
    
    const doc = await this.context.collection("ratings").findOne(filter, { session: this.session });
    if (!doc || !doc.replies) return null;

    const reply = doc.replies.find(r => r._id.toString() === replyId.toString());
    if (!reply) return null;

    let likes = reply.likes || [];
    let isLiked = false;
    
    const index = likes.indexOf(likerEmail);
    if (index > -1) {
      
      await this.context.collection("ratings").updateOne(filter, {
        $pull: { "replies.$.likes": likerEmail }
      }, { session: this.session });
      isLiked = false;
    } else {
      
      await this.context.collection("ratings").updateOne(filter, {
        $addToSet: { "replies.$.likes": likerEmail }
      }, { session: this.session });
      isLiked = true;
    }
    
    
    const updatedDoc = await this.context.collection("ratings").findOne(filter, { session: this.session });
    const updatedReply = updatedDoc.replies.find(r => r._id.toString() === replyId.toString());
    
    return {
      likesCount: (updatedReply.likes || []).length,
      isLiked: isLiked,
      replyUserEmail: updatedReply.userEmail
    };
  }

  async addReply(movieId, reviewUserEmail, replyObj) {
    const filter = { movieId: new ObjectId(movieId), userEmail: reviewUserEmail };
    
    
    if (!replyObj._id) replyObj._id = new ObjectId();
    if (!replyObj.likes) replyObj.likes = [];
    
    await this.context.collection("ratings").updateOne(filter, {
      $push: { replies: replyObj }
    }, { session: this.session });
    
    const updatedDoc = await this.context.collection("ratings").findOne(filter, { session: this.session });
    return updatedDoc && Array.isArray(updatedDoc.replies) ? updatedDoc.replies : [];
  }

  async deleteRating(movieId, userEmail) {
    const result = await this.context.collection("ratings").deleteOne(
      { movieId: new ObjectId(movieId), userEmail: userEmail },
      { session: this.session }
    );
    return result.deletedCount > 0;
  }

  async updateReply(movieId, reviewUserEmail, replyId, replyUserEmail, newContent) {
    const filter = { 
      movieId: new ObjectId(movieId), 
      userEmail: reviewUserEmail,
      "replies._id": new ObjectId(replyId),
      "replies.userEmail": replyUserEmail
    };
    
    const result = await this.context.collection("ratings").updateOne(filter, {
      $set: { 
        "replies.$.content": newContent,
        "replies.$.updatedAt": new Date()
      }
    }, { session: this.session });
    
    return result.modifiedCount > 0;
  }
}
module.exports = MovieRepository;
