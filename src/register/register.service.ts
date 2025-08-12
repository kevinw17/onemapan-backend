import bcrypt from "bcrypt";
import { findExistingUsername, createUserCredential } from "./register.repository";
import { UserCredential } from "@prisma/client";

export const registerCredential = async (
  username: string,
  password: string
): Promise<UserCredential> => {
  if (!username || !password) {
    throw new Error("Username dan password wajib diisi");
  }

  const existing = await findExistingUsername(username);
  if (existing) {
    throw new Error("Username sudah digunakan");
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const newCredential = await createUserCredential({
    username,
    hashed_password: hashedPassword,
  });

  return newCredential;
};
