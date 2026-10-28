const express = require("express");
const accountController = require("../controllers/account.controller");
const transactionController = require("../controllers/transaction.controller");

const router = express.Router();

router.post("/", accountController.createAccount);
router.get("/:id/balance", accountController.getAccountBalance);
router.post("/:id/transactions", transactionController.createTransaction);
router.get("/:id/transactions", transactionController.getTransactionHistory);

module.exports = router;
