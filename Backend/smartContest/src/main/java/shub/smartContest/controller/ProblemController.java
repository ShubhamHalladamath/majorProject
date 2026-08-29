package shub.smartContest.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.dto.problem.ContestProblemResponse;
import shub.smartContest.service.ProblemService;

import java.util.List;

@RestController
@RequestMapping("/api/contests")
public class ProblemController {

    private final ProblemService problemService;

    public ProblemController(ProblemService problemService) {
        this.problemService = problemService;
    }

    @GetMapping("/{contestId}/problems")
    public ResponseEntity<List<ContestProblemResponse>> getContestProblems(@PathVariable Long contestId) {
        // Return only problem metadata (no hidden test cases)
        List<ContestProblemResponse> problems = problemService.getContestProblems(contestId);
        return ResponseEntity.ok(problems);
    }
}
