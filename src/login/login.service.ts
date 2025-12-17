import { UserCredential, User, Korwil } from "@prisma/client";
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
    area?: string | null;
    fotang_id?: number | null;
  };
}

export const loginUser = async ({ username, password }: LoginInput): Promise<LoginResult> => {
  if (!username || !password) {
    throw new Error("Username dan password wajib diisi");
  }

  const user = await findUserByUsername(username);

  if (!user) {
    throw new Error("User tidak ditemukan");
  }

  if (!user.username || user.user_credential == null || user.hashed_password == null) {
    throw new Error("Data user tidak valid");
  }

  const isPasswordValid = await bcrypt.compare(password, user.hashed_password);
  if (!isPasswordValid) {
    throw new Error("Password salah");
  }

  const userInfo = await prisma.user.findFirst({
    where: { userCredential: { user_credential: user.user_credential } },
    include: {
      userRoles: { include: { role: true } },
      qiudao: {
        include: {
          qiu_dao_location: true,
        },
      },
    },
  });

  if (!userInfo) {
    throw new Error("Data user tidak lengkap");
  }

  const primaryRole = userInfo.userRoles[0]?.role.name || "User";
  let scope: string = "self";
  let area: string | null = null;
  let fotangId: number | null = null;

  if (userInfo.qiudao?.qiu_dao_location_id) {
    fotangId = userInfo.qiudao.qiu_dao_location_id;
  }

  const normalizedRole = primaryRole.toLowerCase().replace(/\s+/g, "");

  // Di dalam loginUser, setelah tentukan primaryRole, scope, area, dll

  // Ambil permissions dari role user (asumsi user punya 1 role utama)
  let permissions: any = {};

  if (userInfo.userRoles && userInfo.userRoles.length > 0) {
    // Ambil dari role pertama (atau bisa combine semua kalau multiple role)
    permissions = userInfo.userRoles[0].role.permissions || {};

    // KALAU MAU COMBINE SEMUA ROLE (RECOMMENDED KALAU USER BISA PUNYA >1 ROLE)
    userInfo.userRoles.forEach((userRole) => {
      if (userRole.role.permissions) {
        Object.assign(permissions, userRole.role.permissions);
      }
    });
  }

  // Override untuk role nasional (Super Admin, Ketua, Sekjen) — pastikan full access
  if (
    normalizedRole === "superadmin" ||
    normalizedRole === "ketualembaga" ||
    normalizedRole === "sekjenlembaga"
  ) {
    permissions = {
      ...permissions,
      umat: { create: true, read: true, update: true, delete: true, scope: "nasional" },
      qiudao: { create: true, read: true, update: true, delete: true, scope: "nasional" },
      // tambah module lain kalau perlu
    };
  }

  // Admin Vihara
  if (normalizedRole === "adminvihara") {
    permissions = {
      ...permissions,
      umat: { create: true, read: true, update: true, delete: true, scope: "fotang" },
    };
  }

  // Admin Wilayah biasa
  if (normalizedRole === "admin") {
    permissions = {
      ...permissions,
      umat: { create: true, read: true, update: true, delete: true, scope: "wilayah" },
    };
  }

  let tokenScope = "self";

  if (permissions.umat?.scope) {
    tokenScope = permissions.umat.scope;
  } else if (
    normalizedRole === "superadmin" ||
    normalizedRole === "ketualembaga" ||
    normalizedRole === "sekjenlembaga"
  ) {
    tokenScope = "nasional";
  } else if (normalizedRole === "adminvihara") {
    tokenScope = "fotang";
  } else if (normalizedRole === "admin") {
    tokenScope = "wilayah";
  }

  // GENERATE TOKEN DENGAN scope YANG BENAR
  const token = jwt.sign(
    {
      credential_id: user.user_credential,
      username: user.username,
      user_info_id: userInfo.user_info_id,
      role: primaryRole,
      normalizedRole,
      scope: tokenScope,  // ← INI YANG DIPAKAI BACKEND UNTUK FILTER DATA
      area,
      fotang_id: fotangId,
      permissions  // ← INI DIPAKAI FRONTEND UNTUK TAMPILKAN UI ADMIN
    },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
  
  const { hashed_password, ...safeUserData } = user;

  await updateLastLoggedIn(user.user_credential);

  return {
    message: "Login berhasil",
    token,
    user_data: { 
      ...safeUserData, 
      user_info_id: userInfo.user_info_id, 
      scope: tokenScope,
      role: primaryRole, 
      area, 
      fotang_id: fotangId 
    },
  };
};