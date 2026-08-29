package shub.smartContest.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.dto.SubmissionResultResponse;
import shub.smartContest.dto.SubmitRequest;
import shub.smartContest.dto.SubmitResponse;
import shub.smartContest.entity.TestCase;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.exception.SystemBusyException;
import shub.smartContest.repository.TestCaseRepository;
import shub.smartContest.service.SubmissionResultService;
import shub.smartContest.service.SubmissionService;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@Slf4j
public class SubmissionController {


    private final SubmissionService submissionService;
    private final SubmissionResultService submissionResultService;
    private final TestCaseRepository testCaseRepository;

    public SubmissionController(SubmissionService submissionService,
                                SubmissionResultService submissionResultService,
                                TestCaseRepository testCaseRepository) {
        this.submissionService = submissionService;
        this.submissionResultService = submissionResultService;
        this.testCaseRepository = testCaseRepository;
    }

    @PostMapping
    public ResponseEntity<SubmitResponse> submitCode(@RequestBody SubmitRequest request) {
        SubmitResponse response = submissionService.submitCode(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SubmissionResultResponse> getSubmissionResult(@PathVariable Long id) {
        SubmissionResultResponse response = submissionResultService.getSubmissionResult(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/test-case")
    public ResponseEntity<TestCase> createTestCase(@RequestBody TestCase testCase) {
        TestCase saved = testCaseRepository.save(testCase);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/test-cases/batch")
    public ResponseEntity<List<TestCase>> createTestCasesBatch(@RequestBody List<TestCase> testCases) {
        List<TestCase> saved = testCaseRepository.saveAll(testCases);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/test-cases/{problemId}")
    public ResponseEntity<List<TestCase>> getTestCases(@PathVariable Long problemId) {
        List<TestCase> testCases = testCaseRepository.findByProblemId(problemId);
        return ResponseEntity.ok(testCases);
    }

    @ExceptionHandler(SystemBusyException.class)
    public ResponseEntity<SubmitResponse> handleSystemBusy(SystemBusyException ex) {
        SubmitResponse response = SubmitResponse.builder()
                .status("SYSTEM_BUSY")
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<String> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }
}
