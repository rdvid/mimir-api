export async function up(knex) {
    await knex.schema.createTable('users', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('username').notNullable().unique();
        table.string('name').notNullable();
        table.string('email').notNullable().unique();
        table.string('avatar').notNullable().defaultTo('https://i.postimg.cc/cCWKmfzs/satoro-1.jpg');
        table.string('date_of_birth').notNullable().defaultTo('');
        table.string('profession').notNullable().defaultTo('');
        table.string('instagram_link').notNullable().defaultTo('');
        table.string('facebook_link').notNullable().defaultTo('');
        table.string('current_pocket_money').notNullable().defaultTo('0');
        table.string('password').nullable();
        table.string('google_id').nullable();
        table.enum('auth_provider', ['google', 'local']).notNullable().defaultTo('local');
        table.boolean('is_verified').notNullable().defaultTo(false);
        table.timestamp('last_login', { useTz: true }).nullable();
        table.timestamp('current_login', { useTz: true }).nullable();
        table.timestamps(true, true);
        table.index('username');
    });
    await knex.schema.createTable('pocket_money_history', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table
            .uuid('user_id')
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table.string('date').notNullable();
        table.string('amount').notNullable();
        table.string('source').notNullable();
        table.timestamps(true, true);
        table.index('user_id');
    });
    await knex.schema.createTable('lent_money_history', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table
            .uuid('user_id')
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table.string('person_name').notNullable();
        table.string('price').notNullable();
        table.string('date').notNullable();
        table.timestamps(true, true);
        table.index('user_id');
    });
    await knex.schema.createTable('active_sessions', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table
            .uuid('user_id')
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table.text('token').notNullable();
        table.string('ip').notNullable();
        table.string('user_agent').notNullable();
        table.timestamp('last_used_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamps(true, true);
        table.index(['user_id', 'token']);
    });
    await knex.schema.createTable('expenses', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table
            .uuid('user_id')
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');
        table.string('date').notNullable();
        table.timestamps(true, true);
        table.index(['user_id', 'date']);
    });
    await knex.schema.createTable('expense_products', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table
            .uuid('expense_id')
            .notNullable()
            .references('id')
            .inTable('expenses')
            .onDelete('CASCADE');
        table.string('name').notNullable();
        table.float('price').notNullable();
        table.string('category').notNullable();
        table.string('label').nullable();
        table.timestamps(true, true);
        table.index('expense_id');
    });
    await knex.schema.createTable('deleted_users', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('username').notNullable();
        table.string('name').notNullable();
        table.string('email').notNullable();
        table.string('avatar').notNullable();
        table.string('current_pocket_money').notNullable().defaultTo('0');
        table.timestamps(true, true);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('deleted_users');
    await knex.schema.dropTableIfExists('expense_products');
    await knex.schema.dropTableIfExists('expenses');
    await knex.schema.dropTableIfExists('active_sessions');
    await knex.schema.dropTableIfExists('lent_money_history');
    await knex.schema.dropTableIfExists('pocket_money_history');
    await knex.schema.dropTableIfExists('users');
}
