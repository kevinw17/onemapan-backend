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

  const normalizedRole = primaryRole.toLowerCase().replace(/\s+/g, "");

  if (
    normalizedRole === "superadmin" ||
    normalizedRole === "ketualembaga" ||
    normalizedRole === "sekjenlembaga"
  ) {
    scope = "nasional";
    area = null;
  } else {
    if (userInfo.qiudao?.qiu_dao_location) {
      area = userInfo.qiudao.qiu_dao_location.area;
      if (!Object.values(Korwil).includes(area as Korwil)) {
        area = null;
      }
    }

    scope = userInfo.userRoles.some((ur) => {
      const permissions = ur.role.permissions as Permissions | null;
      return permissions?.qiudao?.scope === "nasional";
    })
      ? "nasional"
      : userInfo.userRoles.some((ur) => {
          const permissions = ur.role.permissions as Permissions | null;
          return permissions?.qiudao?.scope === "wilayah";
        })
      ? "wilayah"
      : "self";

    if (primaryRole === "User") {
      scope = "self";
    }

    if (normalizedRole !== "superadmin" && scope === "wilayah" && !area) {
      const error = new Error("Wilayah pengguna tidak didefinisikan");
      (error as any).statusCode = 400;
      throw error;
    }
  }

  const token = jwt.sign(
    {
      credential_id: user.user_credential,
      username: user.username,
      user_info_id: userInfo.user_info_id,
      role: primaryRole,
      normalizedRole,
      scope,
      area,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  const { hashed_password, ...safeUserData } = user;

  await updateLastLoggedIn(user.user_credential);

  return {
    message: "Login berhasil",
    token,
    user_data: { ...safeUserData, user_info_id: userInfo.user_info_id, scope, role: primaryRole, area },
  };
};