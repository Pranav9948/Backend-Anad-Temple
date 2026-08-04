declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
      requestId: string;
      startTime: number;
    }
  }
}

export {};
