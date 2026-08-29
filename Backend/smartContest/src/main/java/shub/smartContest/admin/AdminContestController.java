package shub.smartContest.admin;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.dto.contest.ContestRequest;
import shub.smartContest.dto.contest.ContestResponse;
import shub.smartContest.security.SecurityUser;
import shub.smartContest.service.ContestService;

import java.util.List;

import shub.smartContest.dto.leaderboard.LeaderboardRow;
import shub.smartContest.service.LeaderboardService;

import shub.smartContest.repository.UserRepository;
import shub.smartContest.entity.User;

@RestController
@RequestMapping("/api/admin/contests")
public class AdminContestController {

    private final ContestService contestService;
    private final LeaderboardService leaderboardService;
    private final UserRepository userRepository;

    public AdminContestController(ContestService contestService,
                                  LeaderboardService leaderboardService,
                                  UserRepository userRepository) {
        this.contestService = contestService;
        this.leaderboardService = leaderboardService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<ContestResponse> createContest(@RequestBody ContestRequest request) {
        User user = getAuthenticatedUser();
        ContestResponse response = contestService.createContest(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }


    @PutMapping("/{contestId}")
    public ResponseEntity<ContestResponse> updateContest(@PathVariable Long contestId, @RequestBody ContestRequest request) {
        ContestResponse response = contestService.updateContest(contestId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{contestId}")
    public ResponseEntity<Void> deleteContest(@PathVariable Long contestId) {
        contestService.deleteContest(contestId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{contestId}/publish")
    public ResponseEntity<ContestResponse> publishContest(@PathVariable Long contestId) {
        ContestResponse response = contestService.publishContest(contestId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{contestId}/cancel")
    public ResponseEntity<ContestResponse> cancelContest(@PathVariable Long contestId) {
        ContestResponse response = contestService.cancelContest(contestId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<ContestResponse>> getAllContests() {
        return ResponseEntity.ok(contestService.getAllContestsForAdmin());
    }

    @GetMapping("/{contestId}")
    public ResponseEntity<ContestResponse> getContestDetails(@PathVariable Long contestId) {
        return ResponseEntity.ok(contestService.getContestDetails(contestId, true));
    }

    @GetMapping("/{contestId}/leaderboard")
    public ResponseEntity<List<LeaderboardRow>> getLeaderboard(@PathVariable Long contestId) {
        return ResponseEntity.ok(leaderboardService.getLeaderboard(contestId));
    }

    private User getAuthenticatedUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof SecurityUser) {
            return ((SecurityUser) principal).getUser();
        }
        String username;
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            username = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new shub.smartContest.exception.ResourceNotFoundException("User not found: " + username));
    }
}


