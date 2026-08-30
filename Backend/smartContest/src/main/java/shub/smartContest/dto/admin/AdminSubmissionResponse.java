package shub.smartContest.dto.admin;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminSubmissionResponse {
    private Long id;
    private Long problemId;
    private String problemTitle;
    private Long userId;
    private String username;
    private Long contestId;
    private String sourceCode;
    private String status;
    private Integer passed;
    private Integer total;
    private Integer score;
    private LocalDateTime createdAt;
}
