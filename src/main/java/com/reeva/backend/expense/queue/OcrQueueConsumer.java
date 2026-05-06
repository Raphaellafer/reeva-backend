package com.reeva.backend.expense.queue;

import com.reeva.backend.ai.OcrService;
import com.reeva.backend.expense.Expense;
import com.reeva.backend.expense.ExpenseRepository;
import com.reeva.backend.expense.ExpenseStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OcrQueueConsumer {

    private static final Logger log = LoggerFactory.getLogger(OcrQueueConsumer.class);

    private final OcrService ocrService;
    private final OcrQueuePublisher publisher;
    private final ExpenseRepository expenseRepository;

    @Value("${ocr.queue.max-retries}")
    private int maxRetries;

    public OcrQueueConsumer(OcrService ocrService, OcrQueuePublisher publisher,
                            ExpenseRepository expenseRepository) {
        this.ocrService = ocrService;
        this.publisher = publisher;
        this.expenseRepository = expenseRepository;
    }

    @RabbitListener(queues = "${ocr.queue.name}")
    public void consume(OcrJobMessage message) {
        log.info("Processing OCR job [expenseId={}, attempt={}/{}]",
            message.expenseId(), message.attemptNumber(), maxRetries);
        try {
            ocrService.processExpense(message.expenseId());
        } catch (Exception e) {
            log.warn("OCR job failed [expenseId={}, attempt={}]: {}",
                message.expenseId(), message.attemptNumber(), e.getMessage());

            if (message.attemptNumber() < maxRetries) {
                publisher.republish(message.retry());
            } else {
                log.error("OCR job exhausted retries [expenseId={}], marking as OCR_FAILED",
                    message.expenseId());
                markAsFailed(message);
            }
        }
    }

    @Transactional
    protected void markAsFailed(OcrJobMessage message) {
        expenseRepository.findById(message.expenseId()).ifPresent(expense -> {
            try {
                expense.transitionTo(ExpenseStatus.OCR_FAILED);
                expenseRepository.save(expense);
            } catch (Exception ex) {
                log.error("Could not transition expense {} to OCR_FAILED: {}", message.expenseId(), ex.getMessage());
            }
        });
    }
}
