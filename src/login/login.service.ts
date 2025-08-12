import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByUsername, updateLastLoggedIn } from "./login.repository";
import { UserCredential } from "@prisma/client";

interface LoginInput {
  username: string;
  password: string;
}

interface LoginResult {
  message: string;
  token: string;
  user_data: Omit<UserCredential, "hashed_password">;
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

  await updateLastLoggedIn(user.user_credential);

  const token = jwt.sign(
    {
      credential_id: user.user_credential,
      username: user.username,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  const { hashed_password, ...safeUserData } = user;

  return {
    message: "Login berhasil",
    token,
    user_data: safeUserData,
  };
};
