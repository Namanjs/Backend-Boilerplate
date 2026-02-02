import dotenv from "dotenv";
import { ConnectDB } from "./config/db.js";
import { app } from "./app.js";

dotenv.config({
    path: "../.env"
});

const PORT = process.env.PORT || 5000;

ConnectDB()
    .then(() => {
        app.on("error", (error) => {
            console.error("Express App Error: ", error);
            throw error;// checks if the express server is running and not failed to start
        });

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.log("MongoDB db connection failed !!!", error);
        process.exit(1);
    })