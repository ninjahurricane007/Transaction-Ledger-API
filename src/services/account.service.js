const pool = require("../config/db");

async function createAccount(name) {
  const result = await pool.query(
    `insert into accounts(name)
        values($1)
        returning id, name, balance, created_at`,
    [name],
  );

  return result.rows[0];
}

async function getAccountBalance(id) {
  const result = await pool.query(
    `SELECT id, balance
     FROM accounts
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] || null;
}

module.exports = { createAccount, getAccountBalance };
