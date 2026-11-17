-- Ensure the digest function exists even when this migration is run on a
-- database whose historical migration ledger predates the extension setup.
create extension if not exists pgcrypto;

-- Replace stored bearer tokens with SHA-256 digests.
-- The API accepts both digest and legacy raw values during rollout.
update sessions
   set token = encode(digest(token, 'sha256'), 'hex');
