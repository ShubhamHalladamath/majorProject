package shub.smartContest.dto.contest;

import lombok.*;
import shub.smartContest.entity.ContestParticipantStatus;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentResponse {
    private Long id;
    private Long contestId;
    private Long userId;
    private LocalDateTime enrolledAt;
    private LocalDateTime startedAt;
    private ContestParticipantStatus status;
}
