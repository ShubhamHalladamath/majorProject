package shub.smartContest.service;

import org.springframework.stereotype.Service;
import shub.smartContest.entity.TestCase;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.repository.TestCaseRepository;
import java.util.List;

@Service
public class TestCaseService {

    private final TestCaseRepository testCaseRepository;

    public TestCaseService(TestCaseRepository testCaseRepository) {
        this.testCaseRepository = testCaseRepository;
    }

    public List<TestCase> getTestCasesByProblemId(Long problemId) {
        return testCaseRepository.findByProblemId(problemId);
    }

    public TestCase createTestCase(Long problemId, TestCase testCase) {
        testCase.setProblemId(problemId);
        return testCaseRepository.save(testCase);
    }

    public List<TestCase> createTestCasesBatch(Long problemId, List<TestCase> testCases) {
        for (TestCase tc : testCases) {
            tc.setProblemId(problemId);
        }
        return testCaseRepository.saveAll(testCases);
    }

    public TestCase updateTestCase(Long problemId, Long testCaseId, TestCase request) {
        TestCase tc = testCaseRepository.findById(testCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Test case not found with id: " + testCaseId));
        if (!tc.getProblemId().equals(problemId)) {
            throw new IllegalArgumentException("Test case does not belong to the specified problem");
        }
        tc.setInput(request.getInput());
        tc.setExpectedOutput(request.getExpectedOutput());
        return testCaseRepository.save(tc);
    }

    public void deleteTestCase(Long problemId, Long testCaseId) {
        TestCase tc = testCaseRepository.findById(testCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Test case not found with id: " + testCaseId));
        if (!tc.getProblemId().equals(problemId)) {
            throw new IllegalArgumentException("Test case does not belong to the specified problem");
        }
        testCaseRepository.delete(tc);
    }
}
