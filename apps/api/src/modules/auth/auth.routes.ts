import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth";
import * as controller from "./auth.controller";

const router = Router();

// Slow down brute-force login/register attempts.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authRateLimit, controller.register);
router.post("/login", authRateLimit, controller.login);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);

export default router;
