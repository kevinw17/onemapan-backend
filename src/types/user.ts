import { User, Korwil, UserRole, Role } from "@prisma/client";

export type UserWithRelations = User & {
    qiudao?: { qiu_dao_location?: { area: Korwil } };
    id_card_location?: any;
    domicile_location?: any;
    userCredential?: any;
    spiritualUser?: any;
    userRoles?: (UserRole & { role: Role })[];
    role?: string | null;
};