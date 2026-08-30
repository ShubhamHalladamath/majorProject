package shub.smartContest.dto.proctoring;

import lombok.*;
import shub.smartContest.entity.ProctoringEvent;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProctoringSessionDetail {
    private Long sessionId;
    private Long contestId;
    private String contestTitle;
    private Long studentId;
    private String studentUsername;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime mobileConnectedAt;
    private Integer photoCount;
    private Integer laptopPhotosCount;
    private Integer mobilePhotosCount;
    private List<AdminImageDetail> images;
    private List<ProctoringEvent> events;
}
