package com.reeva.backend.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${ocr.queue.name}")
    private String queueName;

    @Value("${ocr.queue.dlq-name}")
    private String dlqName;

    @Value("${ocr.queue.exchange}")
    private String exchangeName;

    @Bean
    public DirectExchange ocrExchange() {
        return new DirectExchange(exchangeName, true, false);
    }

    @Bean
    public DirectExchange ocrDlqExchange() {
        return new DirectExchange(exchangeName + ".dlq", true, false);
    }

    @Bean
    public Queue ocrQueue() {
        return QueueBuilder.durable(queueName)
            .withArgument("x-dead-letter-exchange", exchangeName + ".dlq")
            .withArgument("x-dead-letter-routing-key", dlqName)
            .build();
    }

    @Bean
    public Queue ocrDlq() {
        return QueueBuilder.durable(dlqName).build();
    }

    @Bean
    public Binding ocrBinding(Queue ocrQueue, DirectExchange ocrExchange) {
        return BindingBuilder.bind(ocrQueue).to(ocrExchange).with(queueName);
    }

    @Bean
    public Binding ocrDlqBinding(Queue ocrDlq, DirectExchange ocrDlqExchange) {
        return BindingBuilder.bind(ocrDlq).to(ocrDlqExchange).with(dlqName);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}
