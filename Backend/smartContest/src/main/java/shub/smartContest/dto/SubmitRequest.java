package shub.smartContest.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitRequest {
    private Long problemId;
    private String sourceCode;
    private Integer languageId;
    private Long contestId;

    public SubmitRequest(Long problemId, String sourceCode, Integer languageId) {
        this.problemId = problemId;
        this.sourceCode = sourceCode;
        this.languageId = languageId;
    }
}
