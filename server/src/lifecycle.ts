export interface ClosablePool {
  end(): Promise<void>;
}

/**
 * Stops accepting HTTP work, waits for active requests, then closes PostgreSQL.
 * A deadline prevents a stuck request from keeping the process alive forever.
 */
export function shutdownGracefully(
  server: {
    close(callback: (error?: Error) => void): void;
    closeAllConnections(): void;
  },
  pool: ClosablePool,
  timeoutMs = 10_000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let poolEndPromise: Promise<void> | undefined;

    const closePoolOnce = () => {
      poolEndPromise ??= pool.end();
      return poolEndPromise;
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (error) reject(error);
      else resolve();
    };

    const deadline = setTimeout(() => {
      timedOut = true;
      server.closeAllConnections();
      void closePoolOnce()
        .catch(() => undefined)
        .then(() => finish(new Error('Graceful shutdown deadline exceeded.')));
    }, timeoutMs);
    deadline.unref();

    server.close((serverError) => {
      if (settled || timedOut) return;
      if (serverError) {
        finish(serverError);
        return;
      }
      void closePoolOnce().then(
        () => finish(),
        (error: unknown) =>
          finish(error instanceof Error ? error : new Error('Database pool shutdown failed.')),
      );
    });
  });
}
