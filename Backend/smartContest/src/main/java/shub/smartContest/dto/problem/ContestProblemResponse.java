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
    private String description;
    private String constraints;
    private String inputFormat;
    private String outputFormat;
    private String sampleInput1;
    private String sampleOutput1;
    private String sampleInput2;
    private String sampleOutput2;
}
