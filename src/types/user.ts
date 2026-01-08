import { User, Korwil, UserRole, Role } from "@prisma/client";

type QiuDaoWithIncludes = {
    qiu_dao_id: string;
    qiu_dao_location_id?: number | null;
    qiu_dao_location?: { area: Korwil } | null;
};

export type UserWithRelations = User & {
    qiudao?: QiuDaoWithIncludes;
    id_card_location?: any;
    domicile_location?: any;
    userCredential?: any;
    spiritualUser?: any;
    userRoles?: (UserRole & { role: Role })[];
    role?: string | null;
    area?: Korwil | null;
};