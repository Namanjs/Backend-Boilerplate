import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { loginUser, registeUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, searchUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/registerUser").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }
    ]),
    registeUser
)

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refreshAccessToken").get(verifyJWT, refreshAccessToken);

router.route("/updatePassword").patch(verifyJWT, changeCurrentPassword);

router.route("/getCurrentUser").get(verifyJWT, getCurrentUser);

router.route("/updateDetails").patch(verifyJWT, updateAccountDetails);

router.route("/updateAvatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/searchUser").get(verifyJWT, searchUser)

export default router;
