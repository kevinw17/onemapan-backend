// src/auth/change-password.service.ts

import bcrypt from "bcrypt";
import prisma from "../db";

export const changeUserPassword = async (
    userId: number,
    oldPassword: string,
    newPassword: string
): Promise<void> => {
    if (!oldPassword || !newPassword) {
        throw new Error("Password lama dan password baru wajib diisi");
    }

    if (newPassword.length < 6) {
        throw new Error("Password baru minimal 6 karakter");
    }

    if (oldPassword === newPassword) {
        throw new Error("Password baru tidak boleh sama dengan password lama");
    }

    const credential = await prisma.userCredential.findFirst({
        where: {
            user: {
                user_info_id: userId,
            },
        },
    });

    if (!credential) {
        throw new Error("Akun tidak ditemukan atau belum memiliki credential");
    }

    if (!credential.hashed_password) {
        throw new Error("Data password rusak. Hubungi administrator.");
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, credential.hashed_password);

    if (!isOldPasswordValid) {
        throw new Error("Password lama salah");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.userCredential.update({
        where: {
            user_credential: credential.user_credential,
        },
        data: {
            hashed_password: hashedNewPassword,
        },
    });
};