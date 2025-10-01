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
  user_data: Omit<UserCredential, "hashed_password"> & { user_info_id?: number; scope?: string };
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
    include: { userRoles: { include: { role: true } } },
  });

  if (!userInfo) {
    const error = new Error("Data user tidak lengkap");
    (error as any).statusCode = 500;
    throw error;
  }

  // Log user roles for debugging
  console.log("=== DEBUG LOGIN ===");
  console.log("User Roles:", userInfo.userRoles.map((ur) => ({
    roleName: ur.role.name,
    permissions: ur.role.permissions,
  })));

  // Determine scope
  const scope = userInfo.userRoles.some((ur) => {
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

  console.log("Assigned Scope:", scope);

  const token = jwt.sign(
    {
      credential_id: user.user_credential,
      username: user.username,
      user_info_id: userInfo.user_info_id,
      scope,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  const { hashed_password, ...safeUserData } = user;

  console.log("Generated JWT:", { credential_id: user.user_credential, username: user.username, user_info_id: userInfo.user_info_id, scope });

  return {
    message: "Login berhasil",
    token,
    user_data: { ...safeUserData, user_info_id: userInfo.user_info_id, scope },
  };
};