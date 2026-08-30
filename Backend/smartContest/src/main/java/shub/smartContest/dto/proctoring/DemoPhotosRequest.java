package shub.smartContest.dto.proctoring;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DemoPhotosRequest {
    private Long sessionId;
    private List<String> images;
}
