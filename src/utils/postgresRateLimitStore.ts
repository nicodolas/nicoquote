import { pool } from '../db.js';

type RateLimitResult = {
  current: number;
  ttl: number;
};

type RateLimitCallback = (error: Error | null, result?: RateLimitResult) => void;

type RateLimitOptions = {
  continueExceeding?: boolean;
  exponentialBackoff?: boolean;
};

export class PostgresRateLimitStore {
  private static ensureTablePromise: Promise<void> | undefined;

  private readonly continueExceeding: boolean;
  private readonly exponentialBackoff: boolean;

  constructor(options: RateLimitOptions = {}) {
    this.continueExceeding = options.continueExceeding ?? false;
    this.exponentialBackoff = options.exponentialBackoff ?? false;
  }

  incr(key: string, callback: RateLimitCallback, timeWindow = 60000, max = 1000): void {
    this.increment(key, timeWindow, max).then(
      (result) => callback(null, result),
      (error: Error) => callback(error),
    );
  }

  child(routeOptions: unknown): PostgresRateLimitStore {
    return new PostgresRateLimitStore(routeOptions as RateLimitOptions);
  }

  private async increment(key: string, timeWindow: number, max: number): Promise<RateLimitResult> {
    await PostgresRateLimitStore.ensureTable();

    const now = Date.now();
    const result = await pool.query<RateLimitResult>(
      `
      INSERT INTO rate_limits (rate_key, current, iteration_start_ms, ttl, updated_at)
      VALUES ($1, 1, $2, $3, NOW())
      ON CONFLICT (rate_key) DO UPDATE
      SET
        current = CASE
          WHEN rate_limits.iteration_start_ms + $3 <= $2 THEN 1
          ELSE rate_limits.current + 1
        END,
        iteration_start_ms = CASE
          WHEN rate_limits.iteration_start_ms + $3 <= $2 THEN $2
          WHEN $4::boolean AND rate_limits.current + 1 > $5 THEN $2
          ELSE rate_limits.iteration_start_ms
        END,
        ttl = CASE
          WHEN rate_limits.iteration_start_ms + $3 <= $2 THEN $3
          WHEN $4::boolean AND rate_limits.current + 1 > $5 THEN $3
          WHEN $6::boolean AND rate_limits.current + 1 > $5
            THEN LEAST($3 * POWER(2, rate_limits.current + 1 - $5 - 1), 2147483647)::int
          ELSE GREATEST($3 - ($2 - rate_limits.iteration_start_ms), 0)::int
        END,
        updated_at = NOW()
      RETURNING current, ttl
      `,
      [key, now, timeWindow, this.continueExceeding, max, this.exponentialBackoff],
    );

    return result.rows[0] ?? { current: 1, ttl: timeWindow };
  }

  private static async ensureTable(): Promise<void> {
    if (!PostgresRateLimitStore.ensureTablePromise) {
      PostgresRateLimitStore.ensureTablePromise = pool
        .query(`
          CREATE TABLE IF NOT EXISTS rate_limits (
            rate_key text PRIMARY KEY,
            current integer NOT NULL,
            iteration_start_ms bigint NOT NULL,
            ttl integer NOT NULL,
            updated_at timestamptz NOT NULL DEFAULT NOW()
          )
        `)
        .then(() => undefined);
    }

    return PostgresRateLimitStore.ensureTablePromise;
  }
}
