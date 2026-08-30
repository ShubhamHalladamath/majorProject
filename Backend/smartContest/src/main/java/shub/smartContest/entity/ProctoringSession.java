package shub.smartContest.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_sessions", indexes = {
    @Index(name = "idx_session_token", columnList = "pairing_token"),
    @Index(name = "idx_session_contest_student", columnList = "contest_id, student_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProctoringSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contest_id", nullable = false)
    private Long contestId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "pairing_token", unique = true, nullable = false)
    private String pairingToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProctoringSessionStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "mobile_connected_at")
    private LocalDateTime mobileConnectedAt;

    @Column(name = "last_laptop_photo_at")
    private LocalDateTime lastLaptopPhotoAt;

    @Column(name = "last_mobile_photo_at")
    private LocalDateTime lastMobilePhotoAt;

    @Builder.Default
    @Column(name = "photo_count")
    private Integer photoCount = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.photoCount == null) {
            this.photoCount = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
