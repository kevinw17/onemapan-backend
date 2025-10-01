// authentication.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  credential_id: number;
  username: string;
  user_info_id: number;
  scope?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      userScope?: string;
    }
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.user = decoded;
    req.userScope = decoded.scope || "self";
    console.log("Authenticated user:", { userId: decoded.user_info_id, scope: req.userScope });
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
    return;
  }
};