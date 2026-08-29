package shub.smartContest.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shub.smartContest.entity.SubmissionTestResult;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SubmissionResultResponse {
    private Long submissionId;
    private String status;
    private Integer passed;
    private Integer total;
    private Integer score;
    private String error;
    private List<SubmissionTestResult> testCaseResults;
}

