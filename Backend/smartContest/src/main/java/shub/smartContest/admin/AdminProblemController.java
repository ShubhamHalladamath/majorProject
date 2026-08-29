package shub.smartContest.admin;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.dto.problem.ContestProblemRequest;
import shub.smartContest.dto.problem.ContestProblemResponse;
import shub.smartContest.dto.problem.ProblemRequest;
import shub.smartContest.dto.problem.ProblemResponse;
import shub.smartContest.security.SecurityUser;
import shub.smartContest.service.ProblemService;

import java.util.List;

import shub.smartContest.repository.UserRepository;
import shub.smartContest.entity.User;

@RestController
@RequestMapping("/api/admin")
public class AdminProblemController {

    private final ProblemService problemService;
    private final UserRepository userRepository;

    public AdminProblemController(ProblemService problemService, UserRepository userRepository) {
        this.problemService = problemService;
        this.userRepository = userRepository;
    }

    @PostMapping("/problems")
    public ResponseEntity<ProblemResponse> createProblem(@RequestBody ProblemRequest request) {
        User user = getAuthenticatedUser();
        ProblemResponse response = problemService.createProblem(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/problems")
    public ResponseEntity<List<ProblemResponse>> getAllProblems() {
        return ResponseEntity.ok(problemService.getAllProblems());
    }

    @GetMapping("/problems/{id}")
    public ResponseEntity<ProblemResponse> getProblemById(@PathVariable Long id) {
        return ResponseEntity.ok(problemService.getProblemById(id));
    }

    @PutMapping("/problems/{id}")
    public ResponseEntity<ProblemResponse> updateProblem(@PathVariable Long id, @RequestBody ProblemRequest request) {
        return ResponseEntity.ok(problemService.updateProblem(id, request));
    }

    @DeleteMapping("/problems/{id}")
    public ResponseEntity<Void> deleteProblem(@PathVariable Long id) {
        problemService.deleteProblem(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/contests/{contestId}/problems")
    public ResponseEntity<ContestProblemResponse> addProblemToContest(@PathVariable Long contestId, @RequestBody ContestProblemRequest request) {
        ContestProblemResponse response = problemService.addProblemToContest(contestId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/contests/{contestId}/problems/{problemId}")
    public ResponseEntity<Void> removeProblemFromContest(@PathVariable Long contestId, @PathVariable Long problemId) {
        problemService.removeProblemFromContest(contestId, problemId);
        return ResponseEntity.noContent().build();
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

