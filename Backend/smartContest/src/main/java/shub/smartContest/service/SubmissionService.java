package shub.smartContest.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shub.smartContest.dto.SubmissionJob;
import shub.smartContest.dto.SubmitRequest;
import shub.smartContest.dto.SubmitResponse;
import shub.smartContest.entity.Submission;
import shub.smartContest.entity.SubmissionStatus;
import shub.smartContest.exception.SystemBusyException;
import shub.smartContest.queue.SubmissionQueueManager;
import shub.smartContest.repository.SubmissionRepository;

@Service
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionQueueManager queueManager;

    public SubmissionService(SubmissionRepository submissionRepository,
                             SubmissionQueueManager queueManager) {
        this.submissionRepository = submissionRepository;
        this.queueManager = queueManager;
    }

    @Transactional
    public SubmitResponse submitCode(SubmitRequest request) {
        // 1. Create and save submission as QUEUED
        Submission submission = Submission.builder()
                .problemId(request.getProblemId())
                .sourceCode(request.getSourceCode())
                .languageId(request.getLanguageId())
                .status(SubmissionStatus.QUEUED)
                .passed(0)
                .total(0)
                .score(0)
                .build();

        submission = submissionRepository.save(submission);

        // 2. Put submission job into the queue manager
        SubmissionJob job = new SubmissionJob(
                submission.getId(),
                submission.getProblemId(),
                submission.getSourceCode(),
                submission.getLanguageId()
        );

        boolean enqueued = queueManager.enqueue(job);
        if (!enqueued) {
            // Throw exception to trigger transactional rollback
            throw new SystemBusyException("Too many submissions are currently queued.");
        }

        return SubmitResponse.builder()
                .submissionId(submission.getId())
                .status("QUEUED")
                .build();
    }
}
