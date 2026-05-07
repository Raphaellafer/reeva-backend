package com.reeva.backend.expense.attachment;

import com.reeva.backend.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.util.HexFormat;

@Component
public class AttachmentHashBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AttachmentHashBackfill.class);

    private final AttachmentRepository attachmentRepository;
    private final StorageService storageService;

    public AttachmentHashBackfill(AttachmentRepository attachmentRepository, StorageService storageService) {
        this.attachmentRepository = attachmentRepository;
        this.storageService = storageService;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var attachments = attachmentRepository.findByFileSha256IsNull();
        if (attachments.isEmpty()) {
            return;
        }

        int updated = 0;
        for (ExpenseAttachment attachment : attachments) {
            try {
                attachment.setFileSha256(sha256(storageService.downloadBytes(attachment.getFileUrl())));
                updated++;
            } catch (Exception ex) {
                log.warn("Could not backfill attachment hash id={} file={}",
                    attachment.getId(), attachment.getFileUrl(), ex);
            }
        }
        log.info("Backfilled SHA-256 for {} expense attachments", updated);
    }

    private String sha256(byte[] value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to hash attachment", ex);
        }
    }
}
