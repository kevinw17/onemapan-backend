import { UserCredential } from "@prisma/client";
import prisma from "../db";

export const findUserByUsername = async (
  username: string
): Promise<UserCredential | null> => {
  return await prisma.userCredential.findUnique({
    where: { username },
  });
};

export const updateLastLoggedIn = async (
  userCredentialId: number
): Promise<UserCredential> => {
  return await prisma.userCredential.update({
    where: { user_credential: userCredentialId },
    data: {
      last_logged_in: new Date(),
    },
  });
};
