package shub.smartContest.admin;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.dto.admin.AdminSubmissionResponse;
import shub.smartContest.entity.Submission;
import shub.smartContest.entity.User;
import shub.smartContest.entity.Problem;
import shub.smartContest.repository.SubmissionRepository;
import shub.smartContest.repository.UserRepository;
import shub.smartContest.repository.ProblemRepository;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/submissions")
public class AdminSubmissionController {

    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;

    public AdminSubmissionController(SubmissionRepository submissionRepository,
                                     UserRepository userRepository,
                                     ProblemRepository problemRepository) {
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.problemRepository = problemRepository;
    }

    @GetMapping
    public ResponseEntity<List<Submission>> getAllSubmissions() {
        return ResponseEntity.ok(submissionRepository.findAll());
    }

    @GetMapping("/contest/{contestId}")
    public ResponseEntity<List<AdminSubmissionResponse>> getContestSubmissions(@PathVariable Long contestId) {
        List<Submission> submissions = submissionRepository.findByContestId(contestId);
        List<AdminSubmissionResponse> responseList = submissions.stream().map(s -> {
            String username = userRepository.findById(s.getUserId())
                    .map(User::getUsername)
                    .orElse("Unknown User");
            String problemTitle = problemRepository.findById(s.getProblemId())
                    .map(Problem::getTitle)
                    .orElse("Unknown Problem");
            return AdminSubmissionResponse.builder()
                    .id(s.getId())
                    .problemId(s.getProblemId())
                    .problemTitle(problemTitle)
                    .userId(s.getUserId())
                    .username(username)
                    .contestId(s.getContestId())
                    .sourceCode(s.getSourceCode())
                    .status(s.getStatus().name())
                    .passed(s.getPassed())
                    .total(s.getTotal())
                    .score(s.getScore())
                    .createdAt(s.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(responseList);
    }
}
