package shub.smartContest.admin;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shub.smartContest.entity.TestCase;
import shub.smartContest.service.TestCaseService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/problems/{problemId}/test-cases")
public class AdminTestCaseController {

    private final TestCaseService testCaseService;

    public AdminTestCaseController(TestCaseService testCaseService) {
        this.testCaseService = testCaseService;
    }

    @PostMapping
    public ResponseEntity<TestCase> createTestCase(@PathVariable Long problemId, @RequestBody TestCase testCase) {
        TestCase response = testCaseService.createTestCase(problemId, testCase);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<TestCase>> createTestCasesBatch(@PathVariable Long problemId, @RequestBody List<TestCase> testCases) {
        List<TestCase> response = testCaseService.createTestCasesBatch(problemId, testCases);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{testCaseId}")
    public ResponseEntity<TestCase> updateTestCase(@PathVariable Long problemId, @PathVariable Long testCaseId, @RequestBody TestCase testCase) {
        TestCase response = testCaseService.updateTestCase(problemId, testCaseId, testCase);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{testCaseId}")
    public ResponseEntity<Void> deleteTestCase(@PathVariable Long problemId, @PathVariable Long testCaseId) {
        testCaseService.deleteTestCase(problemId, testCaseId);
        return ResponseEntity.noContent().build();
    }
}
