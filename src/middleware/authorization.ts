import { Request, Response, NextFunction } from "express";
import { getRolesByUserId } from "../role/role.service";
import prisma from "../db";
import { Korwil } from "@prisma/client";

interface PermissionCheck {
  feature: string;
  action: string;
  scope?: string | string[];
}

declare global {
  namespace Express {
    interface Request {
      userScope?: string;
      userLocationId?: number;
      userArea?: Korwil;
    }
  }
}

export const authorize = (required: PermissionCheck) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("=== DEBUG authorize ===");
    console.log("Required Permission:", required);
    console.log("User:", req.user);

    try {
      const userId = req.user?.user_info_id;
      if (!userId) {
        console.log("No user ID in token");
        res.status(401).json({ message: "Unauthorized: User not authenticated" });
        return;
      }

      const userRoles = await getRolesByUserId(userId);
      console.log("User Roles:", userRoles.map(ur => ({ name: ur.role.name, permissions: ur.role.permissions })));

      if (userRoles.length === 0) {
        console.log("No roles assigned");
        res.status(403).json({ message: "Forbidden: No roles assigned" });
        return;
      }

      let hasAccess = false;
      let userScope = "self"; // Default scope
      let userArea: Korwil | undefined;

      // Map roles to scopes
      const roleToScope: Record<string, string> = {
        user: "self",
        admin: "wilayah",
        "super admin": "nasional",
      };

      for (const userRole of userRoles) {
        const roleName = userRole.role.name.toLowerCase();
        const permissions: any = userRole.role.permissions;
        console.log(`Checking role ${roleName} permissions:`, permissions);
        const featurePerms = permissions[required.feature];

        if (featurePerms && featurePerms[required.action] === true) {
          console.log(`Found permission for ${required.feature}.${required.action}`);
          hasAccess = true;

          // Set scope based on role
          const roleScope = roleToScope[roleName] || "self";
          // Prioritize higher scope: nasional > wilayah > self
          if (roleScope === "nasional" || (roleScope === "wilayah" && userScope !== "nasional") || (roleScope === "self" && userScope === "self")) {
            userScope = roleScope;
            console.log(`Set userScope to ${userScope} from role ${roleName}`);
          }
        } else {
          console.log(`No permission for ${required.feature}.${required.action} in role ${roleName}`);
        }
      }

      console.log("Has Access:", hasAccess, "User Scope:", userScope);

      if (!hasAccess) {
        console.log("Permission denied: No access to feature/action");
        res.status(403).json({ message: `Forbidden: No permission for ${required.feature}.${required.action}` });
        return;
      }

      // Handle scope match: Support array of scopes
      const requiredScopes = Array.isArray(required.scope)
        ? required.scope
        : required.scope
          ? [required.scope]
          : [];

      if (requiredScopes.length > 0 && !requiredScopes.includes(userScope) && userScope !== "nasional") {
        console.log(`Scope mismatch: required=${requiredScopes.join(', ')}, userScope=${userScope}`);
        res.status(403).json({ message: `Forbidden: Scope mismatch for ${required.feature}` });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { user_info_id: userId },
        include: {
          qiudao: {
            include: {
              qiu_dao_location: true,
            },
          },
          domicile_location: true,
        },
      });

      if (!user) {
        console.log("User not found in User table");
        res.status(404).json({ message: "User not found" });
        return;
      }

      userArea = user.qiudao?.qiu_dao_location?.area as Korwil | undefined;
      console.log("User Area:", userArea);

      if (!userArea && userScope === "wilayah") {
        console.warn("No area found for user with wilayah scope");
        res.status(403).json({ message: "Forbidden: User has no assigned area" });
        return;
      }

      req.userScope = userScope;
      req.userLocationId = user.domicile_location_id;
      req.userArea = userArea;

      console.log("Assigned Scope:", req.userScope, "Area:", req.userArea, "Location ID:", req.userLocationId);

      next();
    } catch (error: any) {
      console.error("Error in authorize:", error.message);
      res.status(500).json({ message: error.message });
      return;
    }
  };
};
