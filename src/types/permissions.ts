// types/permissions.ts
export interface Permissions {
    umat?: {
        read?: boolean;
        create?: boolean;
        update?: boolean;
        delete?: boolean;
        scope?: "self" | "wilayah" | "nasional";
    };
    qiudao?: {
        read?: boolean;
        create?: boolean;
        update?: boolean;
        delete?: boolean;
        scope?: "self" | "wilayah" | "nasional";
    };
}