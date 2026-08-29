package shub.smartContest.dto.admin;

import lombok.*;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestStatistics {
    private Long contestId;
    private long totalEnrolled;
    private long totalActive;
    private long totalSubmissions;
    private Map<String, Long> submissionsBreakdown;
}
