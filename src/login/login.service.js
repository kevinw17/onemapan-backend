const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { 
  findUserByUsername, 
  updateLastLoggedIn 
} = require("./login.repository");

const loginUser = async ({ username, password }) => {
  if (!username || !password) {
    const error = new Error("Username dan password wajib diisi");

    error.statusCode = 400;

    throw error;
  }

  const user = await findUserByUsername(username);

  if (!user.username || !user.user_credential) {
    const error = new Error("Data user tidak valid");
    error.statusCode = 500;
    throw error;
  }
  
  if (!user) {
    const error = new Error("User tidak ditemukan");

    error.statusCode = 400;

    throw error;
  }

  const isPasswordValid = bcrypt.compare(password, user.hashed_password);
  if (!isPasswordValid) {
    const error = new Error("Password salah");

    error.statusCode = 400;

    throw error;
  }

  await updateLastLoggedIn(user.user_credential);

  const token = jwt.sign(
    {
      credential_id: user.user_credential,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  const { hashed_password, ...safeUserData } = user;

  return {
    message: "Login berhasil",
    token,
    user_data: safeUserData,
  };
};

module.exports = {
  loginUser,
};
