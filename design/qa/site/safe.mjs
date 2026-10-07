// Chromium flags that keep every test browser on this machine: no proxy (the environment's proxy
// would carry requests to the real internet) and every host but localhost unresolvable.
export const SAFE_ARGS = ['--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'];
