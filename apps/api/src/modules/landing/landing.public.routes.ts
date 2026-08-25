import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "./landing.controller";

// Public, unauthenticated router backing the landing page's Services
// section. Mounted at /api/landing.
const router = Router();

const readRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/services", readRateLimit, controller.publicList);

export default router;
