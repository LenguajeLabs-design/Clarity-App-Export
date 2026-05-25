import { Router, type IRouter } from "express";
import healthRouter from "./health";
import parseTasksRouter from "./parse-tasks";
import claritySyncRouter from "./clarity-sync";
import githubProxyRouter from "./github-proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(parseTasksRouter);
router.use(claritySyncRouter);
router.use(githubProxyRouter);

export default router;
