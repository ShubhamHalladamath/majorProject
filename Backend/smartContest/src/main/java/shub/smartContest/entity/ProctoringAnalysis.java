package shub.smartContest.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_analyses", indexes = {
    @Index(name = "idx_analysis_session", columnList = "session_id"),
    @Index(name = "idx_analysis_image", columnList = "image_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProctoringAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "image_id", nullable = false)
    private Long imageId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "face_detected")
    private Boolean faceDetected;

    @Column(name = "multiple_faces")
    private Boolean multipleFaces;

    @Column(name = "phone_detected")
    private Boolean phoneDetected;

    @Column(name = "suspicion_score")
    private Double suspicionScore;

    @Column(name = "analysis_result")
    private String analysisResult;

    @Column(name = "analysis_status", nullable = false)
    private String analysisStatus; // PENDING, PROCESSING, COMPLETED, FAILED

    @Column(name = "analyzed_at")
    private LocalDateTime analyzedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
