import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { registeUser } from "../controllers/user.controller.js";

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

export default router;
