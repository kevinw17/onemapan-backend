import { findAllDianChuanShi } from "./dianchuanshi.repository";


export const getAllDianChuanShiService = async () => {
    const data = await findAllDianChuanShi();
    return data;
};
