import { Router } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import conversationsRouter from "./conversations";
import depositsRouter from "./deposits";
import redeemsRouter from "./redeems";
import gameAccountsRouter from "./game-accounts";
import freePlayRouter from "./free-play";
import gamesRouter from "./games";
import paymentMethodsRouter from "./payment-methods";
import bonusesRouter from "./bonuses";
import faqsRouter from "./faqs";
import telegramButtonsRouter from "./telegram-buttons";
import settingsRouter from "./settings";
import botRouter from "./bot";

const router = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(conversationsRouter);
router.use(depositsRouter);
router.use(redeemsRouter);
router.use(gameAccountsRouter);
router.use(freePlayRouter);
router.use(gamesRouter);
router.use(paymentMethodsRouter);
router.use(bonusesRouter);
router.use(faqsRouter);
router.use(telegramButtonsRouter);
router.use(settingsRouter);
router.use(botRouter);

export default router;
