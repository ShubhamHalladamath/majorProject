package shub.smartContest.service;

import org.springframework.stereotype.Service;
import shub.smartContest.dto.contest.EnrollmentResponse;
import shub.smartContest.entity.*;
import shub.smartContest.exception.AlreadyEnrolledException;
import shub.smartContest.exception.ContestNotActiveException;
import shub.smartContest.exception.ForbiddenException;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.repository.ContestParticipantRepository;
import shub.smartContest.repository.ContestRepository;
import shub.smartContest.repository.ProctoringSessionRepository;

import java.time.LocalDateTime;

@Service
public class EnrollmentService {

    private final ContestParticipantRepository contestParticipantRepository;
    private final ContestRepository contestRepository;
    private final ContestService contestService;
    private final ProctoringSessionRepository proctoringSessionRepository;

    public EnrollmentService(ContestParticipantRepository contestParticipantRepository,
                             ContestRepository contestRepository,
                             ContestService contestService,
                             ProctoringSessionRepository proctoringSessionRepository) {
        this.contestParticipantRepository = contestParticipantRepository;
        this.contestRepository = contestRepository;
        this.contestService = contestService;
        this.proctoringSessionRepository = proctoringSessionRepository;
    }

    public EnrollmentResponse enroll(Long contestId, Long userId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found with id: " + contestId));
        
        // Dynamically compute status
        contest = contestService.checkAndBuildContestStatus(contest);
        
        if (contest.getStatus() == ContestStatus.DRAFT || contest.getStatus() == ContestStatus.CANCELLED) {
            throw new ContestNotActiveException("Cannot enroll in a " + contest.getStatus() + " contest");
        }

        if (contestParticipantRepository.existsByContestIdAndUserId(contestId, userId)) {
            throw new AlreadyEnrolledException("User is already enrolled in this contest");
        }

        ContestParticipant participant = ContestParticipant.builder()
                .contestId(contestId)
                .userId(userId)
                .enrolledAt(LocalDateTime.now())
                .status(ContestParticipantStatus.ENROLLED)
                .build();
        ContestParticipant saved = contestParticipantRepository.save(participant);

        return mapToResponse(saved);
    }

    public EnrollmentResponse startContest(Long contestId, Long userId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found with id: " + contestId));
        
        contest = contestService.checkAndBuildContestStatus(contest);
        
        if (contest.getStatus() != ContestStatus.LIVE) {
            throw new ContestNotActiveException("Cannot start contest. Contest is currently " + contest.getStatus());
        }

        ContestParticipant participant = contestParticipantRepository.findByContestIdAndUserId(contestId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("User is not enrolled in this contest"));

        if (participant.getStatus() != ContestParticipantStatus.ENROLLED) {
            throw new IllegalArgumentException("Contest has already been started or completed by this user");
        }

        // Verify proctoring setup is complete
        ProctoringSession proctoringSession = proctoringSessionRepository.findByContestIdAndStudentId(contestId, userId)
                .orElseThrow(() -> new ForbiddenException("Proctoring session not found. Please complete camera setup."));

        if (proctoringSession.getStatus() != ProctoringSessionStatus.MOBILE_CONNECTED && proctoringSession.getStatus() != ProctoringSessionStatus.ACTIVE) {
            throw new ForbiddenException("Proctoring setup is not ready. Current state: " + proctoringSession.getStatus());
        }

        participant.setStartedAt(LocalDateTime.now());
        participant.setStatus(ContestParticipantStatus.STARTED);
        ContestParticipant saved = contestParticipantRepository.save(participant);

        return mapToResponse(saved);
    }

    public EnrollmentResponse finishContest(Long contestId, Long userId) {
        ContestParticipant participant = contestParticipantRepository.findByContestIdAndUserId(contestId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("User is not enrolled in this contest"));

        participant.setStatus(ContestParticipantStatus.COMPLETED);
        ContestParticipant saved = contestParticipantRepository.save(participant);

        return mapToResponse(saved);
    }

    public EnrollmentResponse getEnrollment(Long contestId, Long userId) {
        ContestParticipant participant = contestParticipantRepository.findByContestIdAndUserId(contestId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("User is not enrolled in this contest"));
        return mapToResponse(participant);
    }

    private EnrollmentResponse mapToResponse(ContestParticipant p) {
        return EnrollmentResponse.builder()
                .id(p.getId())
                .contestId(p.getContestId())
                .userId(p.getUserId())
                .enrolledAt(p.getEnrolledAt())
                .startedAt(p.getStartedAt())
                .status(p.getStatus())
                .build();
    }
}
