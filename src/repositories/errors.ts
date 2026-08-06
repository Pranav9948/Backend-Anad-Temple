/**
 * Typed repository errors — not HTTP-specific.
 * Services map these to HTTP responses in later stages.
 */
export class RepositoryNotFoundError extends Error {
  readonly entity: string;
  readonly identifier: string;

  constructor(entity: string, identifier: string) {
    super(`${entity} not found: ${identifier}`);
    this.name = 'RepositoryNotFoundError';
    this.entity = entity;
    this.identifier = identifier;
  }
}

export class RepositoryConflictError extends Error {
  readonly entity: string;

  constructor(entity: string, message: string) {
    super(message);
    this.name = 'RepositoryConflictError';
    this.entity = entity;
  }
}

export function isPrismaNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  );
}
