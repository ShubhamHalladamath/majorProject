package shub.smartContest.dto.proctoring;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProctoringSessionResponse {
    private Long id;
    private Long contestId;
    private Long studentId;
    private String pairingToken;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime mobileConnectedAt;
    private LocalDateTime lastLaptopPhotoAt;
    private LocalDateTime lastMobilePhotoAt;
    private Integer photoCount;
}
