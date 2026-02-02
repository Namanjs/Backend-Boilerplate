import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const registeUser = asyncHandler(async (req, res) => {
    const { username, email, displayName, password } = req.body;

    const requiredFields = [username, email, password];
    const isAnyFieldEmpty = requiredFields.some((field) => {
        return field === "";
    });

    if(isAnyFieldEmpty){
        throw new ApiError(400, "All Required fields are not provided");
    }

    const isDuplicate = await User.findOne({
        $or: [{username}, {email}]
    });

    if(isDuplicate){
        throw new ApiError(409, "User with this username or password already exist");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    let avatar;

    if(avatarLocalPath){
        avatar = await uploadToCloudinary(avatarLocalPath, "hackathon")

        if(!avatar?.url){
            throw new ApiError(500, "Something went wrong while uploading the avatar file");
        }
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        displayName: displayName,
        password: password,
        avatar: avatar?.url
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User created Successfully")
    )
});

export {
    registeUser
}