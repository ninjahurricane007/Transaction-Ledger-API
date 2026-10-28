const { z } = require("zod");

const createTransactionSchema = z
  .object({
    type: z.enum(["credit", "debit"]),
    amount: z
      .number()
      .finite()
      .positive("Amount must be greater than zero")
      .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
        "Amount must have at most 2 decimal places",
      ),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .max(1000, "Description must not exceed 1000 characters"),
    reference_id: z
      .string()
      .trim()
      .min(1, "Reference ID is required")
      .max(255, "Reference ID must not exceed 255 characters"),
  })
  .strict();

module.exports = { createTransactionSchema };
