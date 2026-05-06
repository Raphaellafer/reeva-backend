package com.reeva.backend.expense.queue;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class OcrQueuePublisher {

    private static final Logger log = LoggerFactory.getLogger(OcrQueuePublisher.class);

    private final RabbitTemplate rabbitTemplate;

    @Value("${ocr.queue.exchange}")
    private String exchange;

    @Value("${ocr.queue.name}")
    private String routingKey;

    public OcrQueuePublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publish(UUID expenseId) {
        OcrJobMessage message = OcrJobMessage.first(expenseId);
        rabbitTemplate.convertAndSend(exchange, routingKey, message);
        log.info("OCR job enqueued [expenseId={}, attempt={}]", expenseId, message.attemptNumber());
    }

    public void republish(OcrJobMessage message) {
        rabbitTemplate.convertAndSend(exchange, routingKey, message);
        log.info("OCR job re-enqueued [expenseId={}, attempt={}]", message.expenseId(), message.attemptNumber());
    }
}
