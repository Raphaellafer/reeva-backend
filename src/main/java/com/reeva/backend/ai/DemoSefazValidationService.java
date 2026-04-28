package com.reeva.backend.ai;

import com.reeva.backend.expense.SefazStatus;
import org.springframework.stereotype.Service;

@Service
public class DemoSefazValidationService implements SefazValidationService {

    @Override
    public SefazValidationResult validate(SefazValidationRequest request) {
        if (request.supplierCnpj() == null || request.supplierCnpj().isBlank()) {
            return new SefazValidationResult(SefazStatus.UNAVAILABLE, "CNPJ ausente para validacao fiscal.");
        }
        if (request.verificationCode() == null || request.verificationCode().isBlank()) {
            return new SefazValidationResult(SefazStatus.NOT_APPLICABLE, "Codigo SEFAZ nao informado no MVP.");
        }
        if (request.verificationCode().toUpperCase().contains("INVALID")) {
            return new SefazValidationResult(SefazStatus.INVALID, "Documento fiscal marcado como invalido no validador demo.");
        }
        return new SefazValidationResult(SefazStatus.VALID, "Documento fiscal validado pelo provedor demo.");
    }
}

