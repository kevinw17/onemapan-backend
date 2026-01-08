import { Request, Response, NextFunction } from "express";
import { getRolesByUserId } from "../role/role.service";
import prisma from "../db";
import { Korwil } from "@prisma/client";
import { JwtPayload } from "./authentication";
import { findUserById } from "../profile/user/user.repository";

interface PermissionCheck {
  feature: string;
  action: string;
  scope?: string | string[];
}

interface ExtendedJwtPayload extends JwtPayload {
  normalizedRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: ExtendedJwtPayload;
      userRole?: string;
      userScope?: string;
      userLocationId?: number | undefined;
      userArea?: Korwil | undefined;
    }
  }
}

export const authorize = (required: PermissionCheck) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized: No user data in request" });
        return;
      }

      const userId = String(req.user.user_info_id);
      if (!userId) {
        res.status(401).json({ message: "Unauthorized: User ID not found in token" });
        return;
      }

      const normalizedRole = req.user.normalizedRole || (req.user.role ? req.user.role.toLowerCase().replace(/\s+/g, "") : "");

      let hasAccess = false;
      let userScope = req.user.scope || "self";
      let userArea: Korwil | undefined;
      let userRole = normalizedRole;

      if (
        normalizedRole === "superadmin" ||
        normalizedRole === "ketualembaga" ||
        normalizedRole === "sekjenlembaga" ||
        normalizedRole === "adminvihara"
      ) {
        const user = await findUserById(userId);

        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        userArea = user.qiudao?.qiu_dao_location?.area || req.user.area as Korwil | undefined;

        // PERBAIKAN UTAMA: JANGAN TIMPA userScope!
        if (normalizedRole === "adminvihara") {
          req.userScope = "fotang";
        } else {
          req.userScope = "nasional";
        }

        req.userRole = req.user.role;
        req.userLocationId = user.domicile_location_id;
        req.userArea = userArea;

        // INI YANG PALING PENTING: kasih tahu frontend bahwa ini admin!
        (req.user as any).isNotUserRole = true;

        next();
        return;
      }
      
      if (
        normalizedRole === "user" &&
        (required.feature === "qiudao" || required.feature === "umat") &&
        required.action === "read"
      ) {
        userScope = "wilayah";
        hasAccess = true;
      } else if (
        (required.feature === "umat" || required.feature === "qiudao") &&
        required.action === "read" &&
        req.user.scope === "self"
      ) {
        hasAccess = true;
      } else {
        const userRoles = await getRolesByUserId(userId);

        if (userRoles.length === 0) {
          res.status(403).json({ message: "Forbidden: No roles assigned" });
          return;
        }

        userRole = normalizedRole || userRoles[0].role.name.toLowerCase().replace(/\s+/g, "");

        for (const userRole of userRoles) {
          const roleName = userRole.role.name.toLowerCase().replace(/\s+/g, "");
          const permissions: any = userRole.role.permissions;
          const featurePerms = permissions[required.feature];

          if (featurePerms && featurePerms[required.action] === true) {
            hasAccess = true;

            const roleScope = featurePerms.scope || "self";
            if (
              roleScope === "nasional" ||
              (roleScope === "wilayah" && userScope !== "nasional") ||
              (roleScope === "self" && userScope === "self")
            ) {
              userScope = roleScope;
            }
          }
        }

        if (!hasAccess) {
          res.status(403).json({ message: `Forbidden: No permission for ${required.feature}.${required.action}` });
          return;
        }
      }

      const requiredScopes = Array.isArray(required.scope) ? required.scope : required.scope ? [required.scope] : [];
      if (requiredScopes.length > 0 && !requiredScopes.includes(userScope) && userScope !== "nasional") {
        res.status(403).json({ message: `Forbidden: Scope mismatch for ${required.feature}` });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { user_info_id: userId },
        include: {
          qiudao: { include: { qiu_dao_location: true } },
          domicile_location: true,
        },
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      userArea = req.user.area ? (req.user.area as Korwil) : user.qiudao?.qiu_dao_location?.area;

      if (!userArea && userScope === "wilayah") {
        res.status(403).json({ message: "Forbidden: User has no assigned area" });
        return;
      }

      req.userRole = userRole;
      req.userScope = userScope;
      req.userLocationId = user.domicile_location_id;
      req.userArea = userArea;

      next();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
      return;
    }
  };
};