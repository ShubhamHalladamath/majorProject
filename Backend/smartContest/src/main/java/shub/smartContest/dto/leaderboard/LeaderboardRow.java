package shub.smartContest.dto.leaderboard;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderboardRow {
    private Integer rank;
    private Long userId;
    private String username;
    private Integer score;
    private Integer problemsSolved;
    private Integer submissionCount;
    private LocalDateTime lastSubmissionTime;
}
