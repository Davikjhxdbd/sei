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
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (error) reject(error);
      else resolve();
    };

    const deadline = setTimeout(() => {
      server.closeAllConnections();
      void pool.end().finally(() =>
        finish(new Error('Graceful shutdown deadline exceeded.')),
      );
    }, timeoutMs);
    deadline.unref();

    server.close((serverError) => {
      if (serverError) {
        finish(serverError);
        return;
      }
      pool.end().then(
        () => finish(),
        (error: unknown) =>
          finish(error instanceof Error ? error : new Error('Database pool shutdown failed.')),
      );
    });
  });
}
