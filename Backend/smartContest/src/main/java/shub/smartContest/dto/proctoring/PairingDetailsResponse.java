package shub.smartContest.dto.proctoring;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PairingDetailsResponse {
    private Long sessionId;
    private Long contestId;
    private String contestTitle;
    private Long studentId;
    private String studentUsername;
    private String status;
}
