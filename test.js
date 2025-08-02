require('dotenv').config();
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');

async function testConnections() {
    const mongo = new MongoClient(process.env.MONGO_URI);
    const redis = new Redis(process.env.REDIS_URL);

    try {
        await mongo.connect();
        console.log("✅ MongoDB connected");

        const dbs = await mongo.db().admin().listDatabases();
        console.log("Databases:", dbs.databases.map(d => d.name));

        await redis.set("test-key", "it works");
        const value = await redis.get("test-key");
        console.log("✅ Redis value:", value);
    } catch (err) {
        console.error("Connection failed", err);
    } finally {
        await mongo.close();
        redis.disconnect();
    }
}

testConnections();
