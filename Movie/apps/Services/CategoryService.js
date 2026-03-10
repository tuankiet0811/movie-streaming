var DatabaseConnection = require(global.__basedir + '/apps/Database/Database');
var Config = require(global.__basedir + "/config/setting.json");
var CategoryRepository = require(global.__basedir + "/apps/Repository/CategoryRepository");

class CategoryService {
    categoryRepository;
    client;
    database;
    session;

    constructor() {
        this.client = DatabaseConnection.getMongoClient();
        this.database = this.client.db(Config.mongodb.database);
        this.categoryRepository = new CategoryRepository(this.database);
    }

    async insertCategory(category) {
        await this.client.connect();
        try {
            return await this.categoryRepository.insertCategory(category);
        } finally {
            await this.client.close();
        }
    }

    async updateCategory(category) {
        await this.client.connect();
        try {
            return await this.categoryRepository.updateCategory(category);
        } finally {
            await this.client.close();
        }
    }

    async deleteCategory(id) {
        await this.client.connect();
        try {
            return await this.categoryRepository.deleteCategory(id);
        } finally {
            await this.client.close();
        }
    }

    async getCategory(id) {
        await this.client.connect();
        try {
            return await this.categoryRepository.getCategory(id);
        } finally {
            await this.client.close();
        }
    }

    async getAllCategories() {
        await this.client.connect();
        try {
            return await this.categoryRepository.getAllCategories();
        } finally {
            await this.client.close();
        }
    }

    async getCategories(page, limit) {
        await this.client.connect();
        try {
            const skip = (page - 1) * limit;
            const data = await this.categoryRepository.getCategories(skip, limit);
            const total = await this.categoryRepository.countCategories();
            return {
                data: data,
                total: total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(total / limit)
            };
        } finally {
            await this.client.close();
        }
    }
}

module.exports = CategoryService;
