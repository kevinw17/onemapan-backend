import { Request, Response, NextFunction } from "express";
import { getRolesByUserId } from "../role/role.service";
import prisma from "../db";
import { Korwil } from "@prisma/client";
import { JwtPayload } from "./authentication";

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
    console.log("=== DEBUG authorize ===");
    console.log("Required Permission:", required);
    console.log("User:", req.user);

    try {
      if (!req.user) {
        console.log("No user in request");
        res.status(401).json({ message: "Unauthorized: No user data in request" });
        return;
      }

      const userId = req.user.user_info_id;
      if (!userId) {
        console.log("No user ID in token");
        res.status(401).json({ message: "Unauthorized: User ID not found in token" });
        return;
      }

      const normalizedRole = req.user.normalizedRole || (req.user.role ? req.user.role.toLowerCase().replace(/\s+/g, "") : "");
      console.log("DEBUG: Normalized role in authorize:", normalizedRole);

      let hasAccess = false;
      let userScope = req.user.scope || "self";
      let userArea: Korwil | undefined;
      let userRole = normalizedRole;

      if (normalizedRole === "superadmin") {
        console.log("Super admin detected, bypassing permission check");
        const user = await prisma.user.findUnique({
          where: { user_info_id: userId },
          include: {
            qiudao: { include: { qiu_dao_location: true } },
            domicile_location: true,
          },
        });

        if (!user) {
          console.log("User not found in User table");
          res.status(404).json({ message: "User not found" });
          return;
        }

        userArea = req.user.area ? (req.user.area as Korwil) : undefined;
        console.log("User Area:", userArea);

        req.userRole = req.user.role;
        req.userScope = "nasional";
        req.userLocationId = user.domicile_location_id;
        req.userArea = userArea;

        console.log("Assigned Role:", req.userRole, "Scope:", req.userScope, "Area:", req.userArea, "Location ID:", req.userLocationId);
        next();
        return;
      }

      // Special case for role "user" to allow wilayah scope for qiudao.read and umat.read
      if (
        normalizedRole === "user" &&
        (required.feature === "qiudao" || required.feature === "umat") &&
        required.action === "read"
      ) {
        console.log(`Allow wilayah scope for ${required.feature}.read for role User`);
        userScope = "wilayah"; // Override scope to wilayah for User role
        hasAccess = true;
      } else if (
        (required.feature === "umat" || required.feature === "qiudao") &&
        required.action === "read" &&
        req.user.scope === "self"
      ) {
        console.log(`Allow self scope for ${required.feature}.read`);
        hasAccess = true;
      } else {
        const userRoles = await getRolesByUserId(userId);
        console.log("User Roles:", userRoles.map((ur) => ({ name: ur.role.name, permissions: ur.role.permissions })));

        if (userRoles.length === 0) {
          console.log("No roles assigned");
          res.status(403).json({ message: "Forbidden: No roles assigned" });
          return;
        }

        userRole = normalizedRole || userRoles[0].role.name.toLowerCase().replace(/\s+/g, "");

        for (const userRole of userRoles) {
          const roleName = userRole.role.name.toLowerCase().replace(/\s+/g, "");
          const permissions: any = userRole.role.permissions;
          console.log(`Checking role ${roleName} permissions:`, permissions);
          const featurePerms = permissions[required.feature];

          if (featurePerms && featurePerms[required.action] === true) {
            console.log(`Found permission for ${required.feature}.${required.action}`);
            hasAccess = true;

            const roleScope = featurePerms.scope || "self";
            if (
              roleScope === "nasional" ||
              (roleScope === "wilayah" && userScope !== "nasional") ||
              (roleScope === "self" && userScope === "self")
            ) {
              userScope = roleScope;
              console.log(`Set userScope to ${userScope} from role ${roleName} permissions`);
            }
          } else {
            console.log(`No permission for ${required.feature}.${required.action} in role ${roleName}`);
          }
        }

        if (!hasAccess) {
          console.log("Permission denied: No access to feature/action", { feature: required.feature, action: required.action });
          res.status(403).json({ message: `Forbidden: No permission for ${required.feature}.${required.action}` });
          return;
        }
      }

      const requiredScopes = Array.isArray(required.scope) ? required.scope : required.scope ? [required.scope] : [];
      if (requiredScopes.length > 0 && !requiredScopes.includes(userScope) && userScope !== "nasional") {
        console.log(`Scope mismatch: required=${requiredScopes.join(", ")}, userScope=${userScope}`);
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
        console.log("User not found in User table");
        res.status(404).json({ message: "User not found" });
        return;
      }

      userArea = req.user.area ? (req.user.area as Korwil) : user.qiudao?.qiu_dao_location?.area;
      console.log("User Area:", userArea);

      if (!userArea && userScope === "wilayah") {
        console.warn("No area found for user with wilayah scope");
        res.status(403).json({ message: "Forbidden: User has no assigned area" });
        return;
      }

      req.userRole = userRole;
      req.userScope = userScope;
      req.userLocationId = user.domicile_location_id;
      req.userArea = userArea;

      console.log("Assigned Role:", req.userRole, "Scope:", req.userScope, "Area:", req.userArea, "Location ID:", req.userLocationId);
      next();
    } catch (error: any) {
      console.error("Error in authorize:", error.message, error.stack);
      res.status(500).json({ message: error.message });
      return;
    }
  };
};