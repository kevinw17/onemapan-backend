const prisma = require("../db");

const findExistingUsername = async (username) => {
    const existing = await prisma.userCredential.findUnique({ where: { username } });

    return existing;
}

const createUserCredential = async (data) => {
    const credential = await prisma.userCredential.create({data});

    return credential;
}

module.exports = {
  findExistingUsername,
  createUserCredential,
};