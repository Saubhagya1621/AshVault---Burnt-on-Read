import { asyncHandler } from "../utils/asyncHandler.js";
import { v4 as uuidv4 } from "uuid";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Secret } from "../models/secret.model.js";
import { User } from "../models/user.model.js";
import { analyzeSecretSensitivity } from "../utils/analyzeSecret.js";

const createSecret = asyncHandler(async (req, res) => {
    const { content, password, expiresAt } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content cannot be empty");
    }

    const secretID = uuidv4();
    let expiryDate = null;
    if (expiresAt) {
        expiryDate = new Date();
        const expirationMap = {
            "1h": 1,
            "24h": 24,
            "7d": 168
        };
        const hoursToAdd = expirationMap[expiresAt] || 24;
        expiryDate.setHours(expiryDate.getHours() + hoursToAdd);
    }

    const newSecret = await Secret.create({
        content,
        secretID,
        password: (password && password.trim() !== "") ? password : null,
        expiresAt: expiryDate,
    });

    if (req.user?._id) {
        await User.findByIdAndUpdate(
            req.user._id,
            { $push: { secrets: newSecret._id } }
        );
    }
    const sensitivityHint = await analyzeSecretSensitivity(content);

    return res.status(201).json(
        new ApiResponse(201, { secretID: newSecret.secretID, sensitivityHint }, "Link generated successfully!")
    );
});

const getSecret = asyncHandler(async (req, res) => {
    const { secretID } = req.params;
    const { password } = req.body;

    const foundSecret = await Secret.findOne({ secretID });

    if (!foundSecret) {
        throw new ApiError(404, "This secret has already been burned or does not exist.");
    }

    // Already burned — content is gone, do not serve it again
    if (foundSecret.isBurned) {
        throw new ApiError(410, "This secret has already been burned and cannot be read again.");
    }

    // Check TTL expiry in code (since we removed MongoDB auto-delete TTL)
    if (foundSecret.expiresAt && new Date(foundSecret.expiresAt) <= new Date()) {
        throw new ApiError(410, "This secret has expired and can no longer be read.");
    }

    // Password check
    if (foundSecret.password) {
        if (!password) {
            throw new ApiError(401, "Password required to decrypt this secret.");
        }
        const isCorrect = await foundSecret.isPasswordCorrect(password);
        if (!isCorrect) {
            throw new ApiError(403, "Incorrect password. Access denied.");
        }
    }

    const secretContent = foundSecret.content;

    // BURN: clear the content and mark as burned — keep the record in DB
    await Secret.findByIdAndUpdate(foundSecret._id, {
        isBurned: true,
        burnedAt: new Date(),
        content: "", // wipe content so it's never served again
    });

    return res.status(200).json(
        new ApiResponse(200, { content: secretContent }, "Secret retrieved and burned forever.")
    );
});

const burnSecret = asyncHandler(async (req, res) => {
    const { secretID } = req.params;

    const foundSecret = await Secret.findOne({ secretID });

    if (!foundSecret) {
        throw new ApiError(404, "Secret not found.");
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.secrets.some(id => id.equals(foundSecret._id))) {
        throw new ApiError(403, "Unauthorized: You don't own this secret.");
    }
    await Secret.findByIdAndUpdate(foundSecret._id, {
        isBurned: true,
        burnedAt: new Date(),
        content: "",
    });

    return res.status(200).json(new ApiResponse(200, {}, "Secret manually destroyed."));
});

const getUserSecrets = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: "secrets",
        select: "-content -password",
    });

    if (!user) throw new ApiError(404, "User not found");

    return res.status(200).json(
        new ApiResponse(200, user.secrets, "Dashboard updated successfully")
    );
});

export { createSecret, getSecret, getUserSecrets, burnSecret };