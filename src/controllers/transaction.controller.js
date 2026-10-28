const { accountIdSchema } = require("../validators/account.validator");
const {
  createTransactionSchema,
} = require("../validators/transaction.validator");
const transactionService = require("../services/transaction.service");

async function createTransaction(req, res, next) {
  try {
    const idValidation = accountIdSchema.safeParse(req.params.id);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const bodyValidation = createTransactionSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: bodyValidation.error.issues,
      });
    }

    const result = await transactionService.createTransaction(
      idValidation.data,
      bodyValidation.data,
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getTransactionHistory(req, res, next) {
  try {
    const idValidation = accountIdSchema.safeParse(req.params.id);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const page = req.query.page === undefined ? 1 : Number(req.query.page);

    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);

    const type = req.query.type;

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be >= 1 and limit must be between 1 and 100",
      });
    }

    if (type !== undefined && type !== "credit" && type !== "debit") {
      return res.status(400).json({
        success: false,
        message: "Type must be credit or debit",
      });
    }

    const result = await transactionService.getTransactionHistory(
      idValidation.data,
      { type, page, limit },
    );

    return res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { createTransaction, getTransactionHistory };
