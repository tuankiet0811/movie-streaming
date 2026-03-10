var ObjectId = require('mongodb').ObjectId;

class CategoryRepository{
  context;
  session;
  constructor(context, session=null){
    this.context = context;
    this.session = session;
  }
  async insertCategory(category){
    var session = this.session;
    return await 
    this.context.collection("category").insertOne(category,{session});
  }
  async updateCategory(category) {
    var session = this.session;
    var idFilter;
    try {
        idFilter = { _id: new ObjectId(category._id) };
    } catch (e) {
        idFilter = { _id: parseInt(category._id) };
    }
    
    return await this.context.collection("category").updateOne(
        idFilter,
        { $set: { Name: category.Name, ParentId: category.ParentId } },
        { session }
    );
  }
  async deleteCategory(id) {
    var session = this.session;
    var idFilter;
    try {
        idFilter = { _id: new ObjectId(id) };
    } catch (e) {
        idFilter = { _id: parseInt(id) };
    }
    return await this.context.collection("category").deleteOne(idFilter, { session });
  }
  async getCategory(id) {
    var idFilter;
    try {
        idFilter = { _id: new ObjectId(id) };
    } catch (e) {
        idFilter = { _id: parseInt(id) };
    }
    return await this.context.collection("category").findOne(idFilter);
  }
  async getAllCategories() {
    return await this.context.collection("category").find({}).toArray();
  }
  async getCategories(skip, limit) {
    return await this.context.collection("category").find({}).skip(skip).limit(limit).toArray();
  }
  async countCategories() {
    return await this.context.collection("category").countDocuments({});
  }
}
module.exports = CategoryRepository;