const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Transaction Ledger API",
      version: "1.0.0",
      description:
        "API for managing accounts, balances, credits, debits, and transaction history.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],
    tags: [
      { name: "Accounts", description: "Account management and balances" },
      { name: "Transactions", description: "Credits, debits, and history" },
    ],
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Account not found" },
          },
        },
        Account: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "John Doe" },
            balance: { type: "string", example: "0.00" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        CreateAccount: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              minLength: 1,
              maxLength: 150,
              example: "John Doe",
            },
          },
        },
        CreateTransaction: {
          type: "object",
          required: ["type", "amount", "description", "reference_id"],
          properties: {
            type: {
              type: "string",
              enum: ["credit", "debit"],
              example: "credit",
            },
            amount: {
              type: "number",
              exclusiveMinimum: 0,
              example: 1000,
            },
            description: {
              type: "string",
              example: "Initial deposit",
            },
            reference_id: {
              type: "string",
              maxLength: 255,
              example: "PAYMENT-001",
            },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            account_id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["credit", "debit"] },
            amount: { type: "string", example: "1000.00" },
            description: { type: "string" },
            reference_id: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      "/api/accounts": {
        post: {
          tags: ["Accounts"],
          summary: "Create an account",
          description: "Creates an account with an initial balance of zero.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateAccount" },
              },
            },
          },
          responses: {
            201: {
              description: "Account created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: { $ref: "#/components/schemas/Account" },
                    },
                  },
                },
              },
            },
            400: {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/api/accounts/{id}/balance": {
        get: {
          tags: ["Accounts"],
          summary: "Get account balance",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            200: { description: "Account balance retrieved" },
            400: { description: "Invalid account ID" },
            404: { description: "Account not found" },
          },
        },
      },
      "/api/accounts/{id}/transactions": {
        post: {
          tags: ["Transactions"],
          summary: "Create a credit or debit transaction",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTransaction" },
              },
            },
          },
          responses: {
            201: { description: "Transaction created and balance updated" },
            400: { description: "Invalid request" },
            404: { description: "Account not found" },
            409: {
              description: "Duplicate reference ID or insufficient funds",
            },
          },
        },
        get: {
          tags: ["Transactions"],
          summary: "Get transaction history",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "type",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["credit", "debit"] },
              description: "Filter by transaction type",
            },
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 10,
              },
            },
          ],
          responses: {
            200: { description: "Transaction history retrieved" },
            400: { description: "Invalid query parameter or account ID" },
            404: { description: "Account not found" },
          },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
