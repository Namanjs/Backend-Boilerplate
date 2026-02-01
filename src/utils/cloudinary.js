import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
})

const uploadToCloudinary = async(localFilePath, foldername = "boilerpate") => {
    try {
        if(!localFilePath){
            return null;
        }

        const response  = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: foldername
        }); //here upload is variable name like saveMyFile

        console.log("File is uploaded to cloudinary", response.url);

        fs.unlinkSync(localFilePath);

        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}