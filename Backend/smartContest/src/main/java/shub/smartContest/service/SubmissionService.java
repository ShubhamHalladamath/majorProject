package shub.smartContest.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shub.smartContest.dto.SubmissionJob;
import shub.smartContest.dto.SubmitRequest;
import shub.smartContest.dto.SubmitResponse;
import shub.smartContest.entity.*;
import shub.smartContest.exception.*;
import shub.smartContest.queue.SubmissionQueueManager;
import shub.smartContest.repository.*;

@Service
public class SubmissionService {


    private final SubmissionRepository submissionRepository;
    private final SubmissionQueueManager queueManager;
    private final ContestRepository contestRepository;
    private final ContestParticipantRepository contestParticipantRepository;
    private final ContestProblemRepository contestProblemRepository;
    private final ContestService contestService;

    public SubmissionService(SubmissionRepository submissionRepository,
                             SubmissionQueueManager queueManager,
                             ContestRepository contestRepository,
                             ContestParticipantRepository contestParticipantRepository,
                             ContestProblemRepository contestProblemRepository,
                             ContestService contestService) {
        this.submissionRepository = submissionRepository;
        this.queueManager = queueManager;
        this.contestRepository = contestRepository;
        this.contestParticipantRepository = contestParticipantRepository;
        this.contestProblemRepository = contestProblemRepository;
        this.contestService = contestService;
    }

    @Transactional
    public SubmitResponse submitCode(SubmitRequest request, Long userId) {
        if (request.getContestId() == null) {
            throw new IllegalArgumentException("Contest ID must be specified");
        }

        // 1. Validate contest
        Contest contest = contestRepository.findById(request.getContestId())
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found with id: " + request.getContestId()));

        contest = contestService.checkAndBuildContestStatus(contest);
        if (contest.getStatus() != ContestStatus.LIVE) {
            throw new ContestNotActiveException("Submissions are only allowed when the contest is LIVE. Current status: " + contest.getStatus());
        }

        // 2. Validate enrollment and start state
        ContestParticipant participant = contestParticipantRepository.findByContestIdAndUserId(request.getContestId(), userId)
                .orElseThrow(() -> new UnauthorizedException("You are not enrolled in this contest"));

        if (participant.getStatus() != ContestParticipantStatus.STARTED) {
            throw new UnauthorizedException("You must start the contest before submitting solutions");
        }

        // 3. Validate problem belongs to contest
        if (!contestProblemRepository.existsByContestIdAndProblemId(request.getContestId(), request.getProblemId())) {
            throw new IllegalArgumentException("Problem does not belong to this contest");
        }

        // 4. Create and save submission as QUEUED
        Submission submission = Submission.builder()
                .problemId(request.getProblemId())
                .userId(userId)
                .contestId(request.getContestId())
                .sourceCode(request.getSourceCode())
                .languageId(request.getLanguageId())
                .status(SubmissionStatus.QUEUED)
                .passed(0)
                .total(0)
                .score(0)
                .build();

        submission = submissionRepository.save(submission);

        // 5. Put submission job into the queue manager
        SubmissionJob job = new SubmissionJob(
                submission.getId(),
                submission.getProblemId(),
                submission.getSourceCode(),
                submission.getLanguageId()
        );

        boolean enqueued = queueManager.enqueue(job);
        if (!enqueued) {
            throw new SystemBusyException("Too many submissions are currently queued.");
        }

        return SubmitResponse.builder()
                .submissionId(submission.getId())
                .status("QUEUED")
                .build();
    }
}

