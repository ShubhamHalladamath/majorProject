package shub.smartContest.dto.proctoring;

import lombok.*;
import shub.smartContest.entity.DeviceType;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProctoringPhotoRequest {
    private String pairingToken; // For mobile pairing context
    private Long sessionId;      // For laptop context
    private DeviceType deviceType;
    private Integer sequenceNumber;
    private LocalDateTime capturedAt;
    private String imageBase64;
}
