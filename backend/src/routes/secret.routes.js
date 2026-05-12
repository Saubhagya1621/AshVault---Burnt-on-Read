import { Router } from "express";
import { createSecret, getSecret, getUserSecrets, burnSecret } from "../controllers/secret.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

console.log("secret.routes.js loaded");

const router = Router();
const optionalAuth = asyncHandler(async (req, res, next) => {
    console.log("optionalAuth hit, next type:", typeof next);
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded?._id).select("-password -refreshToken");
        if (user) req.user = user;
    } catch (_) {
        // Invalid or expired token — treat as guest
    }

    return next();
});

router.route("/create").post(optionalAuth, createSecret);
router.route("/v/:secretID").post(getSecret);
router.route("/burn/:secretID").delete(verifyJWT, burnSecret);
router.route("/my-secrets").get(verifyJWT, getUserSecrets);

export default router;