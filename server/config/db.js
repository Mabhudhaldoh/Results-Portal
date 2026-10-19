const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not configured. Set it in server/.env locally or Vercel Environment Variables online.");
}

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  connectTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000
});

let database;
let connectionPromise;

async function connectDB() {
  if (database) return database;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      await client.connect();
      const connectedDatabase = client.db("MlkEportal");
      await connectedDatabase.command({ ping: 1 });
      database = connectedDatabase;
      console.log("Connected to MongoDB Atlas database:", database.databaseName);
      return database;
    } catch (error) {
      connectionPromise = null;
      console.error("MongoDB Atlas connection failed:", error.message);
      throw error;
    }
  })();

  return connectionPromise;
}

function getDB() {
  if (!database) throw new Error("Database not connected. Call connectDB() first.");
  return database;
}

module.exports = { connectDB, getDB };
