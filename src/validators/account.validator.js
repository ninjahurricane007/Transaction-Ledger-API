const { z } = require("zod");

const createAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Account name is required")
      .max(150, "Account name must not exceed 150 characters"),
  })
  .strict();

const accountIdSchema = z.string().uuid("Invalid account ID");

module.exports = { createAccountSchema, accountIdSchema };
