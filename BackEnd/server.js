import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import getRedisClient from "./utils/redisClient.js";
import authRoutes from "./routes/authRoutes.js";
import articleRoutes from "./routes/articleRoutes.js";
import forumRoutes from "./routes/forumRoutes.js";
import verifyRoutes from "./routes/verifyRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import healthTrackingRoutes from "./routes/healthTrackingRoutes.js";
import medicalRecordRoutes from "./routes/medicalRecordRoutes.js";
import medicalRecordFileRoutes from "./routes/medicalRecordFileRoutes.js";
import errorHandler from "./middleware/errorHandler.js"; 

dotenv.config();
const app = express();

app.use(cookieParser());
(async () => {
    try {
        await getRedisClient();
        console.log("✅ Redis is ready");
    } catch (error) {
        console.error("❌ Failed to connect to Redis:", error);
        process.exit(1);
    }
})();

// Middleware
app.use(express.json());

app.use(
    cors({
        origin: process.env.FRONTEND_URL, 
        credentials: true,
    })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/article", articleRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/verify", verifyRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use("/api/user", userRoutes); // Add the new user routes
app.use("/api/health", healthTrackingRoutes); 
app.use("/api/medical-records", medicalRecordRoutes); 
app.use("/api/medical-record-files", medicalRecordFileRoutes);
// app.get('/profile', authenticateUser, async (req, res) => {
//     const user = await getUserById(req.user.user_id);
//     res.json({ success: true, user });
// });
// Error handling middleware
app.use(errorHandler);
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
