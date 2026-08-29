package shub.smartContest.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "contest_problems",
    uniqueConstraints = @UniqueConstraint(columnNames = {"contest_id", "problem_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestProblem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contest_id", nullable = false)
    private Long contestId;

    @Column(name = "problem_id", nullable = false)
    private Long problemId;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(nullable = false)
    private Integer points;
}
