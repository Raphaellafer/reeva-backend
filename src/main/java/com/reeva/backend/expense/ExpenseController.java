package com.reeva.backend.expense;

import com.reeva.backend.expense.comment.dto.CommentRequest;
import com.reeva.backend.expense.comment.dto.CommentResponse;
import com.reeva.backend.expense.dto.ExpenseRequest;
import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.expense.dto.ExpenseUpdateRequest;
import com.reeva.backend.user.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses")
@Tag(name = "Expenses", description = "Employee expense management")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new expense with an attachment (image or PDF)")
    public ExpenseResponse create(
        @AuthenticationPrincipal User currentUser,
        @RequestPart("file") MultipartFile file,
        @RequestPart("data") @Valid ExpenseRequest request
    ) {
        return expenseService.create(currentUser, file, request);
    }

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit a DRAFT expense for analysis")
    public ExpenseResponse submit(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        return expenseService.submit(currentUser, id);
    }

    @GetMapping("/my")
    @Operation(summary = "List all expenses of the authenticated employee")
    public Page<ExpenseResponse> listMine(
        @AuthenticationPrincipal User currentUser,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        return expenseService.listMine(currentUser, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a specific expense")
    public ExpenseResponse get(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        return expenseService.findMine(currentUser, id);
    }

    @GetMapping("/{id}/status")
    @Operation(summary = "Get the current status of an expense")
    public StatusResponse getStatus(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        return new StatusResponse(id, expenseService.getStatus(currentUser, id));
    }

    @PostMapping("/{id}/retry-ocr")
    @Operation(summary = "Retry OCR analysis for an existing expense")
    public ExpenseResponse retryOcr(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        return expenseService.retryOcr(currentUser, id);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update title/description of a DRAFT expense")
    public ExpenseResponse update(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id,
        @Valid @RequestBody ExpenseUpdateRequest request
    ) {
        return expenseService.update(currentUser, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Soft-delete a DRAFT expense")
    public void delete(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        expenseService.delete(currentUser, id);
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a comment to an expense")
    public CommentResponse addComment(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id,
        @Valid @RequestBody CommentRequest request
    ) {
        return expenseService.addComment(currentUser, id, request);
    }

    @GetMapping("/{id}/comments")
    @Operation(summary = "List all comments on an expense")
    public List<CommentResponse> listComments(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID id
    ) {
        return expenseService.listComments(currentUser, id);
    }

    @GetMapping("/attachments/{attachmentId}")
    @Operation(summary = "View or download an expense attachment")
    public ResponseEntity<byte[]> getAttachment(
        @AuthenticationPrincipal User currentUser,
        @PathVariable UUID attachmentId
    ) {
        ExpenseService.AttachmentFile file = expenseService.getAttachmentFile(currentUser, attachmentId);
        MediaType mediaType = file.mimeType() != null
            ? MediaType.parseMediaType(file.mimeType())
            : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename*=UTF-8''" + file.encodedFileName())
            .body(file.bytes());
    }

    public record StatusResponse(UUID expenseId, ExpenseStatus status) {}
}
