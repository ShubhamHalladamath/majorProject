package shub.smartContest.dto.proctoring;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProctoringSessionSummary {
    private Long sessionId;
    private Long studentId;
    private String studentUsername;
    private String status;
    private Integer photoCount;
    private LocalDateTime lastLaptopPhotoAt;
    private LocalDateTime lastMobilePhotoAt;
    private Long violationsCount;
    private String aiStatus;
}
