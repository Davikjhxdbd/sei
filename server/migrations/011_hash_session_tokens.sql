-- Replace stored bearer tokens with SHA-256 digests.
-- The API accepts both digest and legacy raw values during rollout.
update sessions
   set token = encode(digest(token, 'sha256'), 'hex');
