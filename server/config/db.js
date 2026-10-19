const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();


const uri = process.env.MONGODB_URI;


const client = new MongoClient(uri, {
    serverApi:{
        version:ServerApiVersion.v1,
        strict:true,
        deprecationErrors:true
    },
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000
});


let database;


async function connectDB(){

    try{

        await client.connect();

        database = client.db("MlkEportal");

        await database.command({
            ping:1
        });

        console.log("--------------------------------");
        console.log("✅ Connected to MongoDB Atlas");
        console.log("Database:", database.databaseName);
        console.log("--------------------------------");


    }
    catch(error){

        console.error("");
        console.error("====================================");
        console.error("❌ MongoDB Atlas Connection FAILED");
        console.error("====================================");
        console.error("Error:", error.message);
        console.error("");
        console.error("Possible causes:");
        console.error("  1. Your Atlas cluster may be paused (free tier pauses after inactivity)");
        console.error("  2. Check your network/IP whitelist at cloud.mongodb.com");
        console.error("  3. Verify your connection string in server/.env is correct");
        console.error("  4. Your cluster credentials may be incorrect");
        console.error("");
        console.error("➡️  Go to https://cloud.mongodb.com and check your cluster status");
        console.error("====================================");
        console.error("");

        process.exit(1);

    }

}



function getDB(){

    if(!database){
        throw new Error("Database not connected. Call connectDB() first.");
    }

    return database;

}



module.exports={
    connectDB,
    getDB
};
