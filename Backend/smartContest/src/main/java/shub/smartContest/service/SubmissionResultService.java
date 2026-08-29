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

    public SubmissionResultService(SubmissionRepository submissionRepository,
                                   SubmissionTestResultRepository submissionTestResultRepository) {
        this.submissionRepository = submissionRepository;
        this.submissionTestResultRepository = submissionTestResultRepository;
    }

    public SubmissionResultResponse getSubmissionResult(Long submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found with ID: " + submissionId));

        List<SubmissionTestResult> testCaseResults = submissionTestResultRepository.findBySubmissionId(submissionId);

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
}

