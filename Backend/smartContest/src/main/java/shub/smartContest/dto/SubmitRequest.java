package shub.smartContest.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubmitRequest {
    private Long problemId;
    private String sourceCode;
    private Integer languageId;
}
