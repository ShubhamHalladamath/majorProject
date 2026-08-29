package shub.smartContest.dto.problem;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestProblemResponse {
    private Long id;
    private Long contestId;
    private Long problemId;
    private String title;
    private String difficulty;
    private Integer displayOrder;
    private Integer points;
}
