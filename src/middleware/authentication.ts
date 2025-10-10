import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Korwil } from "@prisma/client";

export interface JwtPayload {
  credential_id: number;
  username: string;
  user_info_id: number;
  role: string;
  scope: string;
  area: string | null;
}

export interface ExtendedJwtPayload extends JwtPayload {
  normalizedRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: ExtendedJwtPayload; // Gunakan ExtendedJwtPayload
      userRole?: string;
      userScope?: string;
      userLocationId?: number | undefined;
      userArea?: Korwil | undefined;
    }
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as ExtendedJwtPayload;
    console.log("DEBUG: Decoded JWT:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};