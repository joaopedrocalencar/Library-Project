//stablish connection with mongodb

require('dotenv').config();
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGO_URI);

let db;

async function connectDB() {
    if (!db) {
        try {
            await client.connect();
            db = client.db('libraryData');
            console.log('Connected to MongoDB');
        } catch (err) {
            console.error('Error connecting to DB')
            throw err;
        }
    }
    return db;
}

module.exports = connectDB;