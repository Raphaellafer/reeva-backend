package com.reeva.backend.expense.attachment;

import com.reeva.backend.expense.Expense;
import com.reeva.backend.user.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "expense_attachments")
public class ExpenseAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_url", nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "file_size_kb")
    private Integer fileSizeKb;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "attachment_type", nullable = false, columnDefinition = "attachment_type")
    private AttachmentType attachmentType = AttachmentType.RECEIPT_IMAGE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ExpenseAttachment() {}

    public ExpenseAttachment(Expense expense, User uploadedBy, String fileName,
                             String fileUrl, Integer fileSizeKb, String mimeType,
                             AttachmentType attachmentType) {
        this.expense = expense;
        this.uploadedBy = uploadedBy;
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.fileSizeKb = fileSizeKb;
        this.mimeType = mimeType;
        this.attachmentType = attachmentType;
    }

    public UUID getId() { return id; }
    public Expense getExpense() { return expense; }
    public User getUploadedBy() { return uploadedBy; }
    public String getFileName() { return fileName; }
    public String getFileUrl() { return fileUrl; }
    public Integer getFileSizeKb() { return fileSizeKb; }
    public String getMimeType() { return mimeType; }
    public AttachmentType getAttachmentType() { return attachmentType; }
    public Instant getCreatedAt() { return createdAt; }
}
