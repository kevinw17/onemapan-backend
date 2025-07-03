const { 
  createQiuDao,
  findQiuDaoById, 
  updateQiuDao,
  removeQiuDao,
  getQiudaosPaginated
} = require("./qiudao.repository");

const registerQiuDao = async (data) => {
  const {
    qiu_dao_name,
    qiu_dao_mandarin_name,
    qiu_dao_location_id,
    lunar_sui_ci_year,
    lunar_month,
    lunar_day,
    lunar_shi_chen_time,
    dian_chuan_shi_name,
    dian_chuan_shi_mandarin_name,
    yin_shi_qd_name,
    yin_shi_qd_mandarin_name,
    bao_shi_qd_name,
    bao_shi_qd_mandarin_name,
  } = data;

  if (!qiu_dao_location_id) {
    throw new Error("Lokasi qiudao wajib diisi");
  }

  const validateName = (name, mandarin, label) => {
    if (!name?.trim() && !mandarin?.trim()) {
      throw new Error(`${label} (Indonesia atau Mandarin) wajib diisi.`);
    }
  };

  validateName(qiu_dao_name, qiu_dao_mandarin_name, "Nama QiuDao");
  validateName(dian_chuan_shi_name, dian_chuan_shi_mandarin_name, "Nama Pandita");
  validateName(yin_shi_qd_name, yin_shi_qd_mandarin_name, "Nama Guru Pengajak");
  validateName(bao_shi_qd_name, bao_shi_qd_mandarin_name, "Nama Guru Penanggung");

  return await createQiuDao({
    qiu_dao_name,
    qiu_dao_mandarin_name,
    qiu_dao_location_id,
    lunar_sui_ci_year,
    lunar_month,
    lunar_day,
    lunar_shi_chen_time,
    dian_chuan_shi_name,
    dian_chuan_shi_mandarin_name,
    yin_shi_qd_name,
    yin_shi_qd_mandarin_name,
    bao_shi_qd_name,
    bao_shi_qd_mandarin_name,
    qiu_dao_card_s3_url: null,
  });
};

const fetchAllQiudao = async ({ page = 1, limit = 10, search = "", searchField = "qiu_dao_mandarin_name"}) => {
  const skip = (page - 1) * limit;

  return await getQiudaosPaginated({ skip, limit, search, searchField });
};

const getQiuDaoById = async (id) => {
  return await findQiuDaoById(id);
};

const updateQiuDaoById = async (id, updateData) => {
  if (!id || typeof id !== "number") {
    throw new Error("ID QiuDao tidak valid");
  }

  const updatedQiuDao = await updateQiuDao(id, updateData);
  return updatedQiuDao;
};

const deleteQiuDaoById = async (id) => {
  if (!id || typeof id !== "number") throw new Error("ID tidak valid");
  return await removeQiuDao(id);
};

module.exports = {
  registerQiuDao,
  fetchAllQiudao,
  getQiuDaoById,
  updateQiuDaoById,
  deleteQiuDaoById
};
