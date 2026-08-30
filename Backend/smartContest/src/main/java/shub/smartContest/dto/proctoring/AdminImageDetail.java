package shub.smartContest.dto.proctoring;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminImageDetail {
    private Long id;
    private Integer sequenceNumber;
    private String deviceType;
    private LocalDateTime capturedAt;
    private String fileUrl;
    private String uploadStatus;
    // AI analysis
    private Boolean faceDetected;
    private Boolean multipleFaces;
    private Boolean phoneDetected;
    private Double suspicionScore;
    private String analysisResult;
    private String analysisStatus;
}
