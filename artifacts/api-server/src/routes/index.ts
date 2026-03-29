import { Router, type IRouter } from "express";
import healthRouter from "./health";
import parseTasksRouter from "./parse-tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(parseTasksRouter);

export default router;
