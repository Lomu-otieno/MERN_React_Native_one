import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Database Connected ${conn.connection.host}`);

    const collection = mongoose.connection.db.collection("users");

    // Create 2dsphere index on 'location' field
    await collection.createIndex({ location: "2dsphere" });

    // Log all indexes
    const indexes = await collection.indexes();
    console.log(indexes);
  } catch (error) {
    console.log("Error Connecting to the Database", error);
    process.exit(1);
  }
};

export default connectDB;
