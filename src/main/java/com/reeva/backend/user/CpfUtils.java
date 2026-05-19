package com.reeva.backend.user;

public final class CpfUtils {

    private CpfUtils() {}

    public static String normalize(String raw) {
        if (raw == null) return null;
        return raw.replaceAll("\\D", "");
    }

    public static boolean isValid(String raw) {
        String cpf = normalize(raw);
        return cpf != null && cpf.length() == 11;
    }
}
