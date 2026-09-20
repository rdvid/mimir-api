export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Mimir API',
        version: '0.0.1',
        description: 'Personal finance MVP — JWT auth, transactions, categories, and filterable summaries.',
    },
    servers: [{ url: '/', description: 'Current host' }],
    tags: [
        { name: 'Auth' },
        { name: 'Transactions' },
        { name: 'Summary' },
        { name: 'Categories' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            ApiResponse: {
                type: 'object',
                properties: {
                    statusCode: { type: 'integer' },
                    data: {},
                    message: {},
                    success: { type: 'boolean' },
                },
            },
            RegisterBody: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    name: { type: 'string' },
                },
            },
            LoginBody: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                },
            },
            Category: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            CreateCategoryBody: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', example: 'Coffee' },
                },
            },
            Transaction: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    categoryId: { type: 'string', format: 'uuid' },
                    categoryName: { type: 'string' },
                    type: { type: 'string', enum: ['expense', 'income'] },
                    amount: { type: 'number', example: 42.5 },
                    date: { type: 'string', format: 'date', example: '2026-09-19' },
                    note: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            CreateTransactionBody: {
                type: 'object',
                required: ['categoryId', 'type', 'amount', 'date'],
                properties: {
                    categoryId: { type: 'string', format: 'uuid' },
                    type: { type: 'string', enum: ['expense', 'income'] },
                    amount: { type: 'number', exclusiveMinimum: 0 },
                    date: { type: 'string', format: 'date' },
                    note: { type: 'string', nullable: true },
                },
            },
            UpdateTransactionBody: {
                type: 'object',
                properties: {
                    categoryId: { type: 'string', format: 'uuid' },
                    type: { type: 'string', enum: ['expense', 'income'] },
                    amount: { type: 'number', exclusiveMinimum: 0 },
                    date: { type: 'string', format: 'date' },
                    note: { type: 'string', nullable: true },
                },
            },
            PeriodFilters: {
                type: 'object',
                properties: {
                    from: { type: 'string', format: 'date' },
                    to: { type: 'string', format: 'date' },
                    type: { type: 'string', enum: ['expense', 'income'] },
                    categoryId: { type: 'string', format: 'uuid' },
                },
            },
        },
    },
    paths: {
        '/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Register',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/RegisterBody' },
                        },
                    },
                },
                responses: { '201': { description: 'Registered — returns token + user' } },
            },
        },
        '/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Login',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/LoginBody' },
                        },
                    },
                },
                responses: { '200': { description: 'Login successful — returns token + user' } },
            },
        },
        '/categories': {
            get: {
                tags: ['Categories'],
                summary: 'List categories',
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Category list' } },
            },
            post: {
                tags: ['Categories'],
                summary: 'Create category',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateCategoryBody' },
                        },
                    },
                },
                responses: { '201': { description: 'Category created' } },
            },
        },
        '/transactions': {
            get: {
                tags: ['Transactions'],
                summary: 'List transactions (filterable)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
                    { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
                    {
                        name: 'type',
                        in: 'query',
                        schema: { type: 'string', enum: ['expense', 'income'] },
                    },
                    { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                    { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
                ],
                responses: { '200': { description: 'Transaction list' } },
            },
            post: {
                tags: ['Transactions'],
                summary: 'Create transaction',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateTransactionBody' },
                        },
                    },
                },
                responses: { '201': { description: 'Transaction created' } },
            },
        },
        '/transactions/{id}': {
            get: {
                tags: ['Transactions'],
                summary: 'Get transaction',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                ],
                responses: { '200': { description: 'Transaction' } },
            },
            patch: {
                tags: ['Transactions'],
                summary: 'Update transaction',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                ],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UpdateTransactionBody' },
                        },
                    },
                },
                responses: { '200': { description: 'Transaction updated' } },
            },
            delete: {
                tags: ['Transactions'],
                summary: 'Delete transaction',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                ],
                responses: { '200': { description: 'Transaction deleted' } },
            },
        },
        '/summary': {
            get: {
                tags: ['Summary'],
                summary: 'Period totals (bot-friendly)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
                    { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
                    {
                        name: 'type',
                        in: 'query',
                        schema: { type: 'string', enum: ['expense', 'income'] },
                    },
                    { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
                ],
                responses: {
                    '200': {
                        description: '{ from, to, type?, totalIncome, totalExpense, net, count }',
                    },
                },
            },
        },
        '/summary/categories': {
            get: {
                tags: ['Summary'],
                summary: 'Totals by category',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
                    { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
                    {
                        name: 'type',
                        in: 'query',
                        schema: { type: 'string', enum: ['expense', 'income'] },
                    },
                    { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
                ],
                responses: { '200': { description: '[{ categoryId, name, total, count }]' } },
            },
        },
        '/summary/monthly': {
            get: {
                tags: ['Summary'],
                summary: 'Totals by month for a year',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'year',
                        in: 'query',
                        required: true,
                        schema: { type: 'integer', example: 2026 },
                    },
                    {
                        name: 'type',
                        in: 'query',
                        schema: { type: 'string', enum: ['expense', 'income'] },
                    },
                ],
                responses: {
                    '200': {
                        description: '[{ month, totalIncome, totalExpense, net }]',
                    },
                },
            },
        },
    },
};
