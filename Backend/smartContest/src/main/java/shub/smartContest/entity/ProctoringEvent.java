package shub.smartContest.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_events", indexes = {
    @Index(name = "idx_event_session", columnList = "session_id"),
    @Index(name = "idx_event_contest_student", columnList = "contest_id, student_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProctoringEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "contest_id", nullable = false)
    private Long contestId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "event_time", nullable = false)
    private LocalDateTime eventTime;

    @Column(columnDefinition = "TEXT")
    private String metadata;
}
