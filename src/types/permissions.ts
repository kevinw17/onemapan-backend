// types/permissions.ts
export interface Permissions {
    umat?: {
        create?: boolean;
        read?: boolean;
        update?: boolean;
        delete?: boolean;
        scope?: "nasional" | "wilayah" | "self";
    };
}