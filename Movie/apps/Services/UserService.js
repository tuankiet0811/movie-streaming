const bcrypt = require('bcryptjs');
const UserRepository = require('../Repository/UserRepository');
const DatabaseConnection = require('../Database/Database');
const User = require('../model/user');

class UserService {
    userRepository;
    client;

    constructor() {
        this.client = DatabaseConnection.getMongoClient();
        const db = this.client.db(require('../../Config/Setting.json').mongodb.database);
        this.userRepository = new UserRepository(db);
    }

    async register(email, password, name) {
        await this.client.connect();
        try {
            const existingUser = await this.userRepository.findUserByEmail(email);
            if (existingUser) {
                throw new Error("Email already exists");
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User(email, hashedPassword, name);
            
            await this.userRepository.insertUser(newUser);
            return newUser;
        } finally {
            await this.client.close();
        }
    }

    async registerAdmin(email, password, name) {
        await this.client.connect();
        try {
            const existingUser = await this.userRepository.findUserByEmail(email);
            if (existingUser) {
                throw new Error("Email already exists");
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User(email, hashedPassword, name, "admin");
            
            await this.userRepository.insertUser(newUser);
            return newUser;
        } finally {
            await this.client.close();
        }
    }

    async login(email, password) {
        await this.client.connect();
        try {
            const user = await this.userRepository.findUserByEmail(email);
            if (!user) {
                return null;
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return null;
            }

            return user;
        } finally {
            await this.client.close();
        }
    }

    async getAllUsers() {
        await this.client.connect();
        try {
            return await this.userRepository.getAllUsers();
        } finally {
            await this.client.close();
        }
    }

    async toggleFavorite(email, movieId) {
        await this.client.connect();
        try {
            const favorites = await this.userRepository.getFavorites(email);
            const exists = favorites.some(id => id.toString() === movieId);
            
            if (exists) {
                await this.userRepository.removeFavorite(email, movieId);
                return { isFavorite: false };
            } else {
                await this.userRepository.addFavorite(email, movieId);
                return { isFavorite: true };
            }
        } finally {
            await this.client.close();
        }
    }

    async getFavorites(email) {
        await this.client.connect();
        try {
            return await this.userRepository.getFavorites(email);
        } finally {
            await this.client.close();
        }
    }
}

module.exports = UserService;
