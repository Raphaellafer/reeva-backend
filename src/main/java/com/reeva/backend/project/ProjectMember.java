package com.reeva.backend.project;

import com.reeva.backend.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "project_members")
public class ProjectMember {

    @EmbeddedId
    private ProjectMemberId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("projectId")
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private User assignedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ProjectMember() {}

    public ProjectMember(Project project, User user, User assignedBy) {
        this.project = project;
        this.user = user;
        this.assignedBy = assignedBy;
        this.id = new ProjectMemberId(project.getId(), user.getId());
    }

    public ProjectMemberId getId() { return id; }
    public Project getProject() { return project; }
    public User getUser() { return user; }
    public User getAssignedBy() { return assignedBy; }
    public Instant getCreatedAt() { return createdAt; }
}
