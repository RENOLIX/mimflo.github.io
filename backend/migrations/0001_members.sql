PRAGMA foreign_keys=ON;
CREATE TABLE users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL, email_key TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('client','admin','owner')),
 email_verified INTEGER NOT NULL DEFAULT 0, disabled INTEGER NOT NULL DEFAULT 0,
 first_name TEXT NOT NULL, last_name TEXT NOT NULL, level TEXT NOT NULL DEFAULT 'B1', exam TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL, selected_plan TEXT, trial_at INTEGER, trial_used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE verification_tokens (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE trial_claims (user_id TEXT NOT NULL UNIQUE REFERENCES users(id),email_key TEXT NOT NULL UNIQUE,ip_hash TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL);
CREATE TABLE requests (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),plan TEXT NOT NULL CHECK(plan IN ('sprint','intensif','performance')),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),created_at INTEGER NOT NULL,reviewed_at INTEGER,reviewed_by TEXT,reference TEXT NOT NULL DEFAULT '');
CREATE UNIQUE INDEX one_pending_request ON requests(user_id) WHERE status='pending';
CREATE TABLE entitlements (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),request_id TEXT UNIQUE REFERENCES requests(id),plan TEXT NOT NULL,starts_at INTEGER NOT NULL,ends_at INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,approved_by TEXT NOT NULL);
CREATE TABLE articles (id TEXT PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,level TEXT NOT NULL,minutes INTEGER NOT NULL,image TEXT NOT NULL DEFAULT 'environment.webp',intro TEXT NOT NULL,paragraphs TEXT NOT NULL,words TEXT NOT NULL DEFAULT '[]',published INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL);
CREATE TABLE article_packs (article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,pack TEXT NOT NULL CHECK(pack IN ('trial','sprint','intensif','performance')),PRIMARY KEY(article_id,pack));
CREATE TABLE notes (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),word TEXT NOT NULL,definition TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE readings (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),article_id TEXT NOT NULL REFERENCES articles(id),seconds INTEGER NOT NULL,transcript TEXT NOT NULL,coverage INTEGER,access_type TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE UNIQUE INDEX one_free_reading ON readings(user_id) WHERE access_type='trial';
CREATE TABLE audit (id TEXT PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE rate_limits (bucket TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);
INSERT INTO settings VALUES ('payment_instructions','Après votre inscription, choisissez un pack. Contactez MimFlo pour obtenir les modalités de paiement. Votre accès sera activé après vérification du paiement par l’administrateur.');
