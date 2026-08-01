'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const SqliteSessionStore = require('../backend/lib/sqlite-session-store');

function call(store, method, ...args) {
    return new Promise((resolve, reject) => {
        store[method](...args, (error, value) => (error ? reject(error) : resolve(value)));
    });
}

describe('SqliteSessionStore', () => {
    it('persists, touches and destroys sessions through the express-session contract', async () => {
        const store = new SqliteSessionStore({ dbPath: ':memory:', ttl: 60 });
        try {
            const sessionData = { userId: 42, cookie: { maxAge: 60_000 } };
            await call(store, 'set', 'session-1', sessionData);
            assert.deepEqual(await call(store, 'get', 'session-1'), sessionData);
            assert.equal(await call(store, 'length'), 1);
            assert.deepEqual(await call(store, 'all'), [sessionData]);

            await call(store, 'touch', 'session-1', { cookie: { maxAge: 120_000 } });
            await call(store, 'destroy', 'session-1');
            assert.equal(await call(store, 'get', 'session-1'), null);
        } finally {
            store.close();
        }
    });

    it('does not return expired sessions', async () => {
        const store = new SqliteSessionStore({ dbPath: ':memory:', ttl: 60 });
        try {
            await call(store, 'set', 'expired', { userId: 7, cookie: { expires: '2000-01-01T00:00:00.000Z' } });
            assert.equal(await call(store, 'get', 'expired'), null);
            assert.equal(await call(store, 'length'), 0);
        } finally {
            store.close();
        }
    });
});
