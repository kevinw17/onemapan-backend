export const isNationalAccessRole = (role: string | undefined): boolean => {
    if (!role) return false;
    const normalized = role.toLowerCase().replace(/\s+/g, "");
    return ["superadmin", "ketualembaga", "sekjenlembaga"].includes(normalized);
};