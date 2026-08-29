package shub.smartContest.dto.contest;

import lombok.*;
import shub.smartContest.entity.ContestStatus;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer duration;
    private ContestStatus status;
}
