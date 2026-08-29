package shub.smartContest.admin;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.entity.Submission;
import shub.smartContest.repository.SubmissionRepository;
import java.util.List;

@RestController
@RequestMapping("/api/admin/submissions")
public class AdminSubmissionController {

    private final SubmissionRepository submissionRepository;

    public AdminSubmissionController(SubmissionRepository submissionRepository) {
        this.submissionRepository = submissionRepository;
    }

    @GetMapping
    public ResponseEntity<List<Submission>> getAllSubmissions() {
        return ResponseEntity.ok(submissionRepository.findAll());
    }
}
