// src/dashboard/dashboard.service.ts

import prisma from "../db";

export const getDashboardStats = async () => {
    const users = await prisma.user.findMany({
        include: {
        qiudao: {
            include: {
            qiu_dao_location: {
                include: {
                locality: {
                    include: {
                    district: {
                        include: {
                        city: {
                            include: { province: true },
                        },
                        },
                    },
                    },
                },
                },
            },
            },
        },
        spiritualUser: true,
        },
    });

    // AMBIL SEMUA FOTANG & DCS NASIONAL
    const allFotang = await prisma.fotang.findMany();
    const allDCS = await prisma.dianChuanShi.findMany();

    // === NASIONAL ===
    const totalUmatNasional = users.length;
    const totalQingkouNasional = users.filter(u => u.is_qing_kou).length;
    const totalViharaNasional = allFotang.length;
    const totalDCSNasional = allDCS.length;
    const totalTZFYNasional = users.filter(u =>
        u.spiritualUser?.spiritual_status === "TanZhu" ||
        u.spiritualUser?.spiritual_status === "FoYuan"
    ).length;
    const totalFuWuYuanNasional = users.filter(u => u.spiritualUser?.is_fuwuyuan).length;

    // Gender Nasional
    const genderNasional = users.reduce((acc, u) => {
        if (u.gender === "Male") acc.Pria++;
        if (u.gender === "Female") acc.Wanita++;
        return acc;
    }, { Pria: 0, Wanita: 0 });

    // Umat per Korwil Nasional
    const korwilMap = users.reduce((acc, u) => {
        const korwil = u.qiudao?.qiu_dao_location?.area || "Unknown";
        acc[korwil] = (acc[korwil] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const qiudaoUmatByKorwil = Object.entries(korwilMap)
        .map(([korwil, umat]) => ({ korwil, umat }))
        .sort((a, b) => {
        const order = ["Korwil_1", "Korwil_2", "Korwil_3", "Korwil_4", "Korwil_5", "Korwil_6"];
        return order.indexOf(a.korwil) - order.indexOf(b.korwil);
        });

    // Umat per Provinsi Nasional
    const provinceMap = users.reduce((acc, u) => {
        const province = u.qiudao?.qiu_dao_location?.locality?.district?.city?.province?.name || "Unknown";
        acc[province] = (acc[province] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const qiudaoUmatByProvince = Object.entries(provinceMap)
        .map(([province, umat]) => ({ province, umat }))
        .sort((a, b) => a.province.localeCompare(b.province));

    // === HITUNG TOTAL VIHARA & DCS PER KORWIL ===
    const viharaByKorwil = allFotang.reduce((acc, f) => {
        const korwil = f.area || "Unknown";
        acc[korwil] = (acc[korwil] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const dcsByKorwil = allDCS.reduce((acc, d) => {
        const korwil = d.area || "Unknown";
        acc[korwil] = (acc[korwil] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
        users,
        allFotang,
        allDCS,
        totalUmatNasional,
        totalQingkouNasional,
        totalViharaNasional,
        totalDCSNasional,
        totalTZFYNasional,
        totalFuWuYuanNasional,
        userUmatByGenderNasional: [
        { gender: "Pria", value: genderNasional.Pria },
        { gender: "Wanita", value: genderNasional.Wanita },
        ],
        qiudaoUmatByKorwil,
        qiudaoUmatByProvince,
        viharaByKorwil,
        dcsByKorwil,
    };
};