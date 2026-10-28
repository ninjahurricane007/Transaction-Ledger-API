const pool = require("../config/db");

async function createTransaction(accountId, data) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // 1. Find and lock the account.
    const accountResult = await client.query(
      `SELECT id
       FROM accounts
       WHERE id = $1
       FOR UPDATE`,
      [accountId],
    );

    if (accountResult.rows.length === 0) {
      const error = new Error("Account not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Check for a duplicate reference ID.
    const duplicateResult = await client.query(
      `SELECT id
       FROM transactions
       WHERE account_id = $1 AND reference_id = $2`,
      [accountId, data.reference_id],
    );

    if (duplicateResult.rows.length > 0) {
      const error = new Error("Reference ID already exists for this account");
      error.statusCode = 409;
      throw error;
    }

    // 3. Update the balance.
    let balanceResult;

    if (data.type === "credit") {
      balanceResult = await client.query(
        `UPDATE accounts
         SET balance = balance + $1::numeric
         WHERE id = $2
         RETURNING balance`,
        [data.amount, accountId],
      );
    } else {
      balanceResult = await client.query(
        `UPDATE accounts
         SET balance = balance - $1::numeric
         WHERE id = $2 AND balance >= $1::numeric
         RETURNING balance`,
        [data.amount, accountId],
      );

      if (balanceResult.rows.length === 0) {
        const error = new Error("Insufficient funds");
        error.statusCode = 409;
        throw error;
      }
    }

    // 4. Save the transaction record.
    const transactionResult = await client.query(
      `INSERT INTO transactions
        (account_id, type, amount, description, reference_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, account_id, type, amount,
                 description, reference_id, created_at`,
      [accountId, data.type, data.amount, data.description, data.reference_id],
    );

    // 5. Commit both changes together.
    await client.query("COMMIT");
    transactionStarted = false;

    return {
      transaction: transactionResult.rows[0],
      balance: balanceResult.rows[0].balance,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    // Check for unique refernce id violation.
    if (error.code === "23505") {
      const duplicateError = new Error(
        "Reference ID already exists for this account",
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getTransactionHistory(accountId, options) {
  const { type, page, limit } = options;
  const offset = (page - 1) * limit;

  // Confirm the account exists.
  const accountResult = await pool.query(
    "SELECT id FROM accounts WHERE id = $1",
    [accountId],
  );

  if (accountResult.rows.length === 0) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  const values = [accountId];
  let typeCondition = "";

  if (type) {
    values.push(type);
    typeCondition = ` AND type = $${values.length}`;
  }

  // Count matching transactions for pagination metadata.
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM transactions
     WHERE account_id = $1${typeCondition}`,
    values,
  );

  const total = countResult.rows[0].total;

  // Add pagination parameters.
  values.push(limit, offset);

  const transactionResult = await pool.query(
    `SELECT id, account_id, type, amount, description,
            reference_id, created_at
     FROM transactions
     WHERE account_id = $1${typeCondition}
     ORDER BY created_at DESC, id DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values,
  );

  return {
    transactions: transactionResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = { createTransaction, getTransactionHistory };
