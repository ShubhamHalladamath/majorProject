package shub.smartContest.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.dto.contest.ContestResponse;
import shub.smartContest.dto.contest.EnrollmentResponse;
import shub.smartContest.security.SecurityUser;
import shub.smartContest.service.ContestService;
import shub.smartContest.service.EnrollmentService;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import shub.smartContest.dto.leaderboard.LeaderboardRow;
import shub.smartContest.service.LeaderboardService;

import shub.smartContest.repository.UserRepository;
import shub.smartContest.entity.User;

@RestController
@RequestMapping("/api/contests")
public class ContestController {

    private final ContestService contestService;
    private final EnrollmentService enrollmentService;
    private final LeaderboardService leaderboardService;
    private final UserRepository userRepository;

    public ContestController(ContestService contestService,
                             EnrollmentService enrollmentService,
                             LeaderboardService leaderboardService,
                             UserRepository userRepository) {
        this.contestService = contestService;
        this.enrollmentService = enrollmentService;
        this.leaderboardService = leaderboardService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<ContestResponse>> getAvailableContests() {
        return ResponseEntity.ok(contestService.getAvailableContestsForUser());
    }

    @GetMapping("/{contestId}")
    public ResponseEntity<ContestResponse> getContestDetails(@PathVariable Long contestId) {
        return ResponseEntity.ok(contestService.getContestDetails(contestId, false));
    }

    @PostMapping("/{contestId}/enroll")
    public ResponseEntity<EnrollmentResponse> enroll(@PathVariable Long contestId) {
        User user = getAuthenticatedUser();
        EnrollmentResponse response = enrollmentService.enroll(contestId, user.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{contestId}/start")
    public ResponseEntity<EnrollmentResponse> startContest(@PathVariable Long contestId) {
        User user = getAuthenticatedUser();
        EnrollmentResponse response = enrollmentService.startContest(contestId, user.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{contestId}/enrollment")
    public ResponseEntity<EnrollmentResponse> getEnrollment(@PathVariable Long contestId) {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(enrollmentService.getEnrollment(contestId, user.getId()));
    }

    @GetMapping("/{contestId}/leaderboard")
    public ResponseEntity<List<LeaderboardRow>> getLeaderboard(@PathVariable Long contestId) {
        // Enforce access rules: throws ResourceNotFoundException if draft/hidden
        contestService.getContestDetails(contestId, false);
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





