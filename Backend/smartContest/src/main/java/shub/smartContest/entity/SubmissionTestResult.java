package shub.smartContest.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "submission_test_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionTestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "test_case_id", nullable = false)
    private Long testCaseId;

    @Column(nullable = false)
    private String status;

    private Double time;

    private Double memory;

    @Column(columnDefinition = "TEXT")
    private String stdout;

    @Column(columnDefinition = "TEXT")
    private String stderr;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Transient
    private String input;

    @Transient
    private String expectedOutput;
}
