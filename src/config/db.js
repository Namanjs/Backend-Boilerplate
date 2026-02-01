import mongoose from "mongoose";

async function ConnectDB() {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`);
    console.log(`\nMongoDB connected !! DB Host: ${connectionInstance.connection.host}`)
}

export { ConnectDB }