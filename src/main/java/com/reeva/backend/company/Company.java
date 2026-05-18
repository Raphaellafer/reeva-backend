package com.reeva.backend.company;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "companies")
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 18, unique = true)
    private String cnpj;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(nullable = false, length = 50)
    private String plan = "FREE";

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_frequency", nullable = false, length = 20)
    private PaymentFrequency paymentFrequency = PaymentFrequency.WEEKLY;

    @Column(name = "payment_weekday")
    private Integer paymentWeekday = 4;

    @Column(name = "payment_day_of_month")
    private Integer paymentDayOfMonth;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Company() {}

    public Company(String name, String cnpj, String email, String plan) {
        this.name = name;
        this.cnpj = cnpj;
        this.email = email;
        this.plan = plan;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getCnpj() { return cnpj; }
    public String getEmail() { return email; }
    public String getLogoUrl() { return logoUrl; }
    public String getPlan() { return plan; }
    public boolean isActive() { return active; }
    public PaymentFrequency getPaymentFrequency() { return paymentFrequency; }
    public Integer getPaymentWeekday() { return paymentWeekday; }
    public Integer getPaymentDayOfMonth() { return paymentDayOfMonth; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setName(String name) { this.name = name; }
    public void setActive(boolean active) { this.active = active; }
    public void setPlan(String plan) { this.plan = plan; }
    public void setPaymentFrequency(PaymentFrequency paymentFrequency) { this.paymentFrequency = paymentFrequency; }
    public void setPaymentWeekday(Integer paymentWeekday) { this.paymentWeekday = paymentWeekday; }
    public void setPaymentDayOfMonth(Integer paymentDayOfMonth) { this.paymentDayOfMonth = paymentDayOfMonth; }
}
