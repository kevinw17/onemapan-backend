// login.service.ts
import { UserCredential, User } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByUsername, updateLastLoggedIn } from "./login.repository";
import prisma from "../db";
import { Permissions } from "../types/permissions";

interface LoginInput {
  username: string;
  password: string;
}

interface LoginResult {
  message: string;
  token: string;
  user_data: Omit<UserCredential, "hashed_password"> & {
    user_info_id?: number;
    scope?: string;
    role?: string;
    area?: string | null; // Matches Korwil enum values or null
  };
}

export const loginUser = async ({ username, password }: LoginInput): Promise<LoginResult> => {
  if (!username || !password) {
    const error = new Error("Username dan password wajib diisi");
    (error as any).statusCode = 400;
    throw error;
  }

  const user = await findUserByUsername(username);

  if (!user) {
    const error = new Error("User tidak ditemukan");
    (error as any).statusCode = 400;
    throw error;
  }

  if (!user.username || user.user_credential == null || user.hashed_password == null) {
    const error = new Error("Data user tidak valid");
    (error as any).statusCode = 500;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.hashed_password);
  if (!isPasswordValid) {
    const error = new Error("Password salah");
    (error as any).statusCode = 400;
    throw error;
  }

  const userInfo = await prisma.user.findFirst({
    where: { userCredential: { user_credential: user.user_credential } },
    include: {
      userRoles: { include: { role: true } },
      qiudao: {
        include: {
          qiu_dao_location: true, // Include Fotang to get area
        },
      },
    },
  });

  if (!userInfo) {
    const error = new Error("Data user tidak lengkap");
    (error as any).statusCode = 500;
    throw error;
  }

  // Log user roles and permissions for debugging
  console.log("=== DEBUG LOGIN ===");
  console.log("User Info:", {
    user_info_id: userInfo.user_info_id,
    username: user.username,
    roles: userInfo.userRoles.map((ur) => ({
      roleName: ur.role.name,
      permissions: ur.role.permissions,
    })),
    fotang_area: userInfo.qiudao?.qiu_dao_location?.area || null,
  });

  // Determine role and scope
  const primaryRole = userInfo.userRoles[0]?.role.name || "User"; // Default to "User" if no roles
  let scope: string;
  let area: string | null = null;

  if (primaryRole === "User") {
    scope = "self";
  } else {
    scope = userInfo.userRoles.some((ur) => {
      const permissions = ur.role.permissions as unknown as Permissions | null;
      return permissions?.umat?.scope === "nasional";
    })
      ? "nasional"
      : userInfo.userRoles.some((ur) => {
          const permissions = ur.role.permissions as unknown as Permissions | null;
          return permissions?.umat?.scope === "wilayah";
        })
      ? "wilayah"
      : "self";

    // Set area for wilayah scope from Fotang
    if (scope === "wilayah" && userInfo.qiudao?.qiu_dao_location) {
      area = userInfo.qiudao.qiu_dao_location.area; // e.g., "Korwil_1"
    }
  }

  console.log("Assigned Scope:", scope, "Area:", area);

  const token = jwt.sign(
    {
      credential_id: user.user_credential,
      username: user.username,
      user_info_id: userInfo.user_info_id,
      role: primaryRole,
      scope,
      area,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  const { hashed_password, ...safeUserData } = user;

  console.log("Generated JWT Payload:", {
    credential_id: user.user_credential,
    username: user.username,
    user_info_id: userInfo.user_info_id,
    role: primaryRole,
    scope,
    area,
  });

  // Update last logged in
  await updateLastLoggedIn(user.user_credential);

  return {
    message: "Login berhasil",
    token,
    user_data: { ...safeUserData, user_info_id: userInfo.user_info_id, scope, role: primaryRole, area },
  };
};