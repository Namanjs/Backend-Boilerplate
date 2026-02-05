import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"
import { escapeRegex } from "../utils/helper.js";

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

const loginUser = asyncHandler(async (req, res) => {
    const { username, password, email } = req.body;

    if((!username && !email) || !password){
        throw new ApiError(400, "Username/email and password are required");
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if(!isPasswordCorrect){
        throw new ApiError(401, "Password is invalid");
    }

    const access_Token = await user.generateAccessToken();

    const refresh_Token = await user.generateRefreshToken();

    if(!access_Token || !refresh_Token){
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }

    user.refreshToken = refresh_Token;

    await user.save({validateBeforeSave: false});

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", access_Token, options)
        .cookie("refreshToken", refresh_Token, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    access_Token,
                    refresh_Token
                },
                "User logged in Successfully"
            )
        )
});

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        { new: true }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res  
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, "User logged out")
        )
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is missing");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(404, "User associated with refresh token not found");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token has been revoked or is invalid");
        }

        const options = {
            httpOnly: true,
            secure: true 
        };

        const access_Token = await user.generateAccessToken();
        const newRefreshToken = await user.generateRefreshToken();

        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        return res
            .status(200)
            .cookie("accessToken", access_Token, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { 
                        accessToken: access_Token,
                        refreshToken: newRefreshToken 
                    },
                    "Access token refreshed successfully"
                )
            );
            
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    const user = await User.findById(req.user?._id);
    
    if(!user){
        throw new ApiError(400, "User not logged in")
    }

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword; //not findByIdAndUpdate as it skips the mongoose middlewares(password hashing) storing a plain text password in the database
    
    await user.save(); // validateBeforeSave should be true to hash the new password

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = req.user;

    return res.status(200).json(
        new ApiResponse(200, user, "Current user details fetched successfully")
    )
});

const updateAccountDetails = asyncHandler(async (req, res) => {

    const {username, email, fullName} = req.body;

    if(!username && !email && !fullName){
        throw new ApiError(400, "No fields provided for update");
    }

    const user = req.user;

    let updates = {};

    if(username && username !== user.username){
        const isDuplicateUsername = await User.findOne({username});

        if(isDuplicateUsername && isDuplicateUsername._id.toString() !== user._id.toString()){
            throw new ApiError(409, "Username already taken")
        }

        updates.username = username;
    }

    if(email && email !== user.email){
        const isDuplicateEmail = await User.findOne({email});

        if(isDuplicateEmail && isDuplicateEmail._id.toString() !== user._id.toString()){
            throw new ApiError(409, "Email already taken")
        }

        updates.email = email;
    }

    if(fullName){
        updates.fullName = fullName;
    }

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
            $set: updates //this will only make changes to the fields written in it an no other
        },
        {new: true}
    ).select("-password -refreshToken")

    if(!updatedUser){
        throw new ApiError(500, "Something went wrong while updating account details");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "Account details updated successfully")
    )
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file not provided");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath, "hackathon");
    
    if(!avatar.url){
        throw new ApiError(500, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(200, user, "User avatar updated successfully")
    )
});

const searchUser = asyncHandler(async (req, res) => {
    const { query } = req.query;

    if (!query) {
        throw new ApiError(400, "Search query is required");
    }

    const sanitizedQuery = escapeRegex(query);

    const users = await User.find({
        $or: [
            { username: { $regex: sanitizedQuery, $options: "i" } },
            { email: { $regex: sanitizedQuery, $options: "i" } },
            { fullName: { $regex: sanitizedQuery, $options: "i" } }
        ],

        _id: { $ne: req.user._id } 
    }).select("-password -refreshToken -balance");

    if (!users.length) {
        throw new ApiError(404, "No users found matching your query");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, users, "Users fetched successfully")
        );
});

export {
    registeUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    searchUser
}