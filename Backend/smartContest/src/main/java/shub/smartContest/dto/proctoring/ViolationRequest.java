package shub.smartContest.dto.proctoring;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViolationRequest {
    private Long sessionId;
    private String eventType;
    private String metadata;
}
