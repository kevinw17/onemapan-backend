import { Korwil } from "@prisma/client";

interface JwtPayload {
    credential_id: number;
    username: string;
    user_info_id: number;
    scope?: string;
    role?: string;
    location_id?: number;
}

declare module "express" {
    interface Request {
        queryParsed?: Record<string, any>;
        user?: JwtPayload;
        userScope?: string;
        userLocationId?: number;
        userArea?: Korwil;
    }
}