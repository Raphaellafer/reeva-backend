package com.reeva.backend.user;

public final class CpfUtils {

    private CpfUtils() {}

    public static String normalize(String raw) {
        if (raw == null) return null;
        return raw.replaceAll("\\D", "");
    }

    public static boolean isValid(String raw) {
        String cpf = normalize(raw);
        if (cpf == null || cpf.length() != 11) return false;
        if (cpf.chars().distinct().count() == 1) return false;

        int firstDigit = calculateDigit(cpf, 9, 10);
        int secondDigit = calculateDigit(cpf, 10, 11);

        return firstDigit == Character.getNumericValue(cpf.charAt(9))
            && secondDigit == Character.getNumericValue(cpf.charAt(10));
    }

    private static int calculateDigit(String cpf, int length, int weightStart) {
        int sum = 0;
        for (int i = 0; i < length; i++) {
            sum += Character.getNumericValue(cpf.charAt(i)) * (weightStart - i);
        }
        int remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
}
