declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        isAdmin?: boolean;
        email?: string;
      };
      requestId: string;
      startTime: number;
    }
  }
}

export {};
