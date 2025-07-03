const prisma = require("../db");

const findUserByUsername = async (username) => {
  return await prisma.userCredential.findUnique({
    where: { username },
  });
};

const updateLastLoggedIn = async (userCredential) => {
  return await prisma.userCredential.update({
    where: { user_credential: userCredential },
    data: {
      last_logged_in: new Date(),
    },
  });
};

module.exports = {
  findUserByUsername,
  updateLastLoggedIn,
};