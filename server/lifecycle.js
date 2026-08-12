/**
 * Process lifecycle: how this server dies, and how a platform can tell it is alive.
 *
 * Nothing here listened before. One rejected promise anywhere in a request
 * handler took the whole site down, nothing restarted it, and nothing noticed —
 * the first anyone would know is a person saying the site is broken.
 *
 * Three separate problems, which is why there are three parts:
 *
 * 1. A crash must be LOUD and FINAL. Node's default for an unhandled rejection
 *    is to terminate, and for an uncaught exception to terminate as well, but
 *    both go out with a bare stack trace and no context. Worse, code that
 *    swallows them leaves a process that is up, answering the health check, and
 *    broken — which is the one state a platform cannot recover from, because
 *    nothing tells it to try. So: log with context, then exit non-zero, so the
 *    supervisor restarts a known-bad process instead of trusting it.
 *
 * 2. A shutdown must be POLITE. Cloud Run sends SIGTERM and then waits before
 *    killing the container. Without a handler the process dies on the spot and
 *    every request in flight is cut mid-response — visible to real people as a
 *    failed exam submission during a routine deploy. So: stop accepting new
 *    connections, let the in-flight ones finish, and exit 0 because a requested
 *    shutdown is not a failure.
 *
 * 3. Either way it must be BOUNDED. `server.close()` waits for open connections,
 *    and a keep-alive connection that nobody is using will happily wait forever.
 *    A shutdown that hangs is a process the platform has to kill anyway, later,
 *    having already stopped serving. So idle connections are closed at once and
 *    a timer guarantees the exit.
 */
'use strict';

/* Long enough for a slow response to finish, short enough that a deploy is not
   held up by one stuck socket. Cloud Run's own grace period is 10s by default,
   so finishing before then keeps the exit ours rather than a SIGKILL. */
const GRACE_MS = parseInt(process.env.SHUTDOWN_GRACE_MS, 10) || 8000;

let shuttingDown = false;

/** For tests: a fresh process is a fresh state, but a suite reuses one. */
function _reset() { shuttingDown = false; }

/**
 * Stop serving and leave with `code`.
 *
 * Guarded against re-entry: a SIGTERM arriving while an uncaught exception is
 * already unwinding must not start a second shutdown and race the first.
 */
function shutdown(server, code, reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[lifecycle] shutting down (${reason}), exit code ${code}`);

  if (!server) return process.exit(code);

  /* Not unref'd on purpose. If server.close() never calls back — one stuck
     socket is enough — this timer is the only thing left that will end the
     process, and an unref'd timer does not keep the loop alive to fire. */
  const giveUp = setTimeout(() => {
    console.error(`[lifecycle] ${GRACE_MS}ms grace expired with connections still open; exiting anyway`);
    process.exit(code);
  }, GRACE_MS);

  server.close(() => {
    clearTimeout(giveUp);
    console.log('[lifecycle] all connections closed');
    process.exit(code);
  });

  /* A keep-alive connection sitting idle is not work in progress, and waiting
     the full grace period for one is the difference between a two-second deploy
     and an eight-second deploy. Node 18+; guarded so an older runtime still works. */
  if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
}

/**
 * What a fatal error prints.
 *
 * Kept separate from the exit so a test can read it without killing the runner,
 * and so the shape is fixed: whoever is reading the logs at 3am needs the kind,
 * the message and the stack in that order, on lines they can grep.
 */
function describeFatal(kind, err) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error && err.stack ? err.stack : '(no stack)';
  return `[lifecycle] FATAL ${kind}: ${message}\n${stack}`;
}

/**
 * Wire the handlers onto this process.
 *
 * `server` is the http.Server from app.listen(); pass null and a fatal error
 * still exits, it simply has nothing to close first.
 */
function install(server, opts) {
  const o = opts || {};
  const exit = o.exit || (code => process.exit(code));
  const onFatal = (kind, err) => {
    console.error(describeFatal(kind, err));
    /* Exit non-zero. A supervisor restarts on a non-zero exit and leaves a zero
       alone, so this is the difference between "restart me" and "I meant that". */
    if (o.shutdownOnFatal === false) return exit(1);
    shutdown(server, 1, kind);
  };

  process.on('unhandledRejection', reason => onFatal('unhandledRejection', reason));
  process.on('uncaughtException', err => onFatal('uncaughtException', err));

  /* SIGTERM is Cloud Run asking politely; SIGINT is Ctrl-C. Both are requested,
     so both leave with 0 — a supervisor that restarts on non-zero must not
     fight a deliberate stop. */
  process.on('SIGTERM', () => shutdown(server, 0, 'SIGTERM'));
  process.on('SIGINT', () => shutdown(server, 0, 'SIGINT'));
}

module.exports = { install, shutdown, describeFatal, GRACE_MS, _reset };
