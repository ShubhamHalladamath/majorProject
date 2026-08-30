package shub.smartContest.service;

import org.springframework.stereotype.Service;
import shub.smartContest.dto.SubmissionResultResponse;
import shub.smartContest.entity.Submission;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.entity.SubmissionTestResult;
import shub.smartContest.repository.SubmissionRepository;
import shub.smartContest.repository.SubmissionTestResultRepository;

import java.util.List;

@Service
public class SubmissionResultService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionTestResultRepository submissionTestResultRepository;
    private final shub.smartContest.repository.TestCaseRepository testCaseRepository;

    public SubmissionResultService(SubmissionRepository submissionRepository,
                                   SubmissionTestResultRepository submissionTestResultRepository,
                                   shub.smartContest.repository.TestCaseRepository testCaseRepository) {
        this.submissionRepository = submissionRepository;
        this.submissionTestResultRepository = submissionTestResultRepository;
        this.testCaseRepository = testCaseRepository;
    }

    public SubmissionResultResponse getSubmissionResult(Long submissionId, Long userId, boolean isAdmin) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + submissionId));

        if (!isAdmin && !submission.getUserId().equals(userId)) {
            throw new shub.smartContest.exception.ForbiddenException("Access denied to this submission");
        }

        List<SubmissionTestResult> testCaseResults = submissionTestResultRepository.findBySubmissionId(submissionId);
        for (SubmissionTestResult tr : testCaseResults) {
            shub.smartContest.entity.TestCase tc = testCaseRepository.findById(tr.getTestCaseId()).orElse(null);
            if (tc != null) {
                tr.setInput(tc.getInput());
                tr.setExpectedOutput(tc.getExpectedOutput());
            }
        }

        return SubmissionResultResponse.builder()
                .submissionId(submission.getId())
                .status(submission.getStatus().name())
                .passed(submission.getPassed())
                .total(submission.getTotal())
                .score(submission.getScore())
                .error(submission.getCompilerOutput())
                .testCaseResults(testCaseResults)
                .build();
    }

    public List<SubmissionResultResponse> getMySubmissions(Long userId) {
        return submissionRepository.findByUserId(userId).stream()
                .map(s -> SubmissionResultResponse.builder()
                        .submissionId(s.getId())
                        .status(s.getStatus().name())
                        .passed(s.getPassed())
                        .total(s.getTotal())
                        .score(s.getScore())
                        .error(s.getCompilerOutput())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }
}


