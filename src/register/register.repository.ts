import prisma from "../db";
import { Prisma, UserCredential } from "@prisma/client";

export const findExistingUsername = async (
  username: string
): Promise<UserCredential | null> => {
  return await prisma.userCredential.findUnique({
    where: { username },
  });
};

export const createUserCredential = async (
  data: Prisma.UserCredentialCreateInput
): Promise<UserCredential> => {
  return await prisma.userCredential.create({
    data,
  });
};
