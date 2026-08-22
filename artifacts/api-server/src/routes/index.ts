import { Router, type IRouter } from "express";
import healthRouter from "./health";
import parseTasksRouter from "./parse-tasks";
import claritySyncRouter from "./clarity-sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(parseTasksRouter);
router.use(claritySyncRouter);

export default router;
