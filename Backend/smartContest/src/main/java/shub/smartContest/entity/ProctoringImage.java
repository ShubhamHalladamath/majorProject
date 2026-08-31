package shub.smartContest.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_images", indexes = {
    @Index(name = "idx_img_session", columnList = "session_id"),
    @Index(name = "idx_img_contest_student", columnList = "contest_id, student_id"),
    @Index(name = "idx_img_seq_device", columnList = "session_id, sequence_number, device_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProctoringImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "contest_id", nullable = false)
    private Long contestId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", nullable = false, length = 32)
    private DeviceType deviceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "capture_type", nullable = false)
    private CaptureType captureType;

    @Column(name = "sequence_number", nullable = false)
    private Integer sequenceNumber;

    @Column(name = "captured_at", nullable = false)
    private LocalDateTime capturedAt;

    @Column(name = "upload_received_at", nullable = false)
    private LocalDateTime uploadReceivedAt;

    @Column(name = "image_path", nullable = true)
    private String imagePath;

    @Lob
    @Column(name = "image_data", columnDefinition = "LONGBLOB")
    private byte[] imageData;

    @Column(name = "upload_status", nullable = false)
    private String uploadStatus;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.uploadReceivedAt == null) {
            this.uploadReceivedAt = LocalDateTime.now();
        }
    }
}
