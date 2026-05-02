import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meetingsRouter from "./meetings";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(settingsRouter);
router.use(meetingsRouter);

export default router;
