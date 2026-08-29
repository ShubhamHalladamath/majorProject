package shub.smartContest.dto.problem;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestProblemRequest {
    private Long problemId;
    private Integer displayOrder;
    private Integer points;
}
