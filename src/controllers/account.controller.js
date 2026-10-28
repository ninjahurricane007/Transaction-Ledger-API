const {
  createAccountSchema,
  accountIdSchema,
} = require("../validators/account.validator");
const accountService = require("../services/account.service");

async function createAccount(req, res, next) {
  try {
    const validation = createAccountSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
      });
    }

    const account = await accountService.createAccount(validation.data.name);

    return res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
}

async function getAccountBalance(req, res, next) {
  try {
    const validation = accountIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await accountService.getAccountBalance(validation.data);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { createAccount, getAccountBalance };
