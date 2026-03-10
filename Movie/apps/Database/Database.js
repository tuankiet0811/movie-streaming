var config = require(global.__basedir + "/Config/Setting.json");
class DatabaseConnection{
    url;
    user;
    pass;
    constructor(){

    }
    static getMongoClient(){
        this.user = config.mongodb.username;
        this.pass = config.mongodb.password;
        this.url = 
        `mongodb+srv://${this.user}:${this.pass}@cluster0.jkpotfg.mongodb.net/?retryWrites=true&w=majority`;
        
        

        const { MongoClient } = require('mongodb');
        const client = new MongoClient(this.url);
        return client;
    }
}

module.exports = DatabaseConnection;