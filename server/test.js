require("dotenv").config();
const { MongoClient } = require("mongodb");

async function test() {
    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();

        console.log("✅ Connected");

        const db = client.db();

        console.log("Database:", db.databaseName);

        const collections = await db.listCollections().toArray();

        console.log(collections);
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

test();