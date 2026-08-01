'use strict';

const path = require('path');
const Database = require('better-sqlite3');
const session = require('express-session');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function finish(callback, ...args) {
    if (typeof callback === 'function') setImmediate(() => callback(...args));
}

class SqliteSessionStore extends session.Store {
    constructor(options = {}) {
        super(options);
        const dbPath = options.dbPath || path.join(process.cwd(), 'sessions.sqlite');
        this.ttlMs = Number(options.ttl || ONE_DAY_MS / 1000) * 1000;
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                sid TEXT PRIMARY KEY,
                expired INTEGER NOT NULL,
                sess TEXT NOT NULL
            )
        `);
        this.statements = {
            get: this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired >= ?'),
            set: this.db.prepare(
                'INSERT INTO sessions (sid, expired, sess) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET expired = excluded.expired, sess = excluded.sess'
            ),
            destroy: this.db.prepare('DELETE FROM sessions WHERE sid = ?'),
            touch: this.db.prepare('UPDATE sessions SET expired = ? WHERE sid = ? AND expired >= ?'),
            clear: this.db.prepare('DELETE FROM sessions'),
            cleanup: this.db.prepare('DELETE FROM sessions WHERE expired < ?'),
            length: this.db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE expired >= ?'),
            all: this.db.prepare('SELECT sess FROM sessions WHERE expired >= ?'),
        };

        const cleanupInterval = Number(options.cleanupInterval || 0);
        this.cleanupTimer = cleanupInterval > 0 ? setInterval(() => this.cleanup(), cleanupInterval) : null;
        this.cleanupTimer?.unref?.();
        this.cleanup();
    }

    expiration(sessionData) {
        const expires = sessionData?.cookie?.expires;
        const expiresAt = expires ? new Date(expires).getTime() : NaN;
        if (Number.isFinite(expiresAt)) return expiresAt;

        const maxAge = Number(sessionData?.cookie?.maxAge ?? sessionData?.cookie?.originalMaxAge);
        return Date.now() + (Number.isFinite(maxAge) && maxAge > 0 ? maxAge : this.ttlMs);
    }

    get(sid, callback) {
        try {
            const now = Date.now();
            const row = this.statements.get.get(sid, now);
            if (!row) {
                this.statements.destroy.run(sid);
                return finish(callback, null, null);
            }
            finish(callback, null, JSON.parse(row.sess));
        } catch (error) {
            finish(callback, error);
        }
    }

    set(sid, sessionData, callback) {
        try {
            this.statements.set.run(sid, this.expiration(sessionData), JSON.stringify(sessionData));
            finish(callback, null);
        } catch (error) {
            finish(callback, error);
        }
    }

    destroy(sid, callback) {
        try {
            this.statements.destroy.run(sid);
            finish(callback, null);
        } catch (error) {
            finish(callback, error);
        }
    }

    touch(sid, sessionData, callback) {
        try {
            this.statements.touch.run(this.expiration(sessionData), sid, Date.now());
            finish(callback, null);
        } catch (error) {
            finish(callback, error);
        }
    }

    clear(callback) {
        try {
            this.statements.clear.run();
            finish(callback, null);
        } catch (error) {
            finish(callback, error);
        }
    }

    length(callback) {
        try {
            finish(callback, null, this.statements.length.get(Date.now()).count);
        } catch (error) {
            finish(callback, error);
        }
    }

    all(callback) {
        try {
            const sessions = this.statements.all.all(Date.now()).map((row) => JSON.parse(row.sess));
            finish(callback, null, sessions);
        } catch (error) {
            finish(callback, error);
        }
    }

    cleanup() {
        this.statements.cleanup.run(Date.now());
    }

    close() {
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
        if (this.db?.open) this.db.close();
    }
}

module.exports = SqliteSessionStore;
