package shub.smartContest.admin;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.dto.admin.ContestStatistics;
import shub.smartContest.service.StatisticsService;

@RestController
@RequestMapping("/api/admin/contests")
public class AdminStatisticsController {

    private final StatisticsService statisticsService;

    public AdminStatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping("/{contestId}/statistics")
    public ResponseEntity<ContestStatistics> getContestStatistics(@PathVariable Long contestId) {
        return ResponseEntity.ok(statisticsService.getContestStatistics(contestId));
    }
}
