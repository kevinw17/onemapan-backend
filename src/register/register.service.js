const bcrypt = require("bcrypt");
const {
  findExistingUsername,
  createUserCredential,
} = require("./register.repository");

const registerCredential = async (username, password) => {
  if (!username || !password) {
    throw new Error("Username dan password wajib diisi");
  }

  const existing = await findExistingUsername(username);
  if (existing) {
    throw new Error("Username sudah digunakan");
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  return await createUserCredential({
    username,
    hashed_password: hashedPassword,
  });
};

module.exports = {
  registerCredential,
};