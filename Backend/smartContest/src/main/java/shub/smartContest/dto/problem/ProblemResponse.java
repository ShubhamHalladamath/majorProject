package shub.smartContest.dto.problem;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProblemResponse {
    private Long id;
    private String title;
    private String description;
    private String constraints;
    private String inputFormat;
    private String outputFormat;
    private String difficulty;
}
