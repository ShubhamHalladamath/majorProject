package shub.smartContest.service;

import org.springframework.stereotype.Service;
import shub.smartContest.dto.admin.ContestStatistics;
import shub.smartContest.entity.ContestParticipantStatus;
import shub.smartContest.entity.Submission;
import shub.smartContest.entity.SubmissionStatus;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.repository.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatisticsService {

    private final ContestRepository contestRepository;
    private final ContestParticipantRepository contestParticipantRepository;
    private final SubmissionRepository submissionRepository;

    public StatisticsService(ContestRepository contestRepository,
                             ContestParticipantRepository contestParticipantRepository,
                             SubmissionRepository submissionRepository) {
        this.contestRepository = contestRepository;
        this.contestParticipantRepository = contestParticipantRepository;
        this.submissionRepository = submissionRepository;
    }

    public ContestStatistics getContestStatistics(Long contestId) {
        if (!contestRepository.existsById(contestId)) {
            throw new ResourceNotFoundException("Contest not found with id: " + contestId);
        }

        long enrolled = contestParticipantRepository.countByContestId(contestId);
        
        long active = contestParticipantRepository.countByContestIdAndStatus(contestId, ContestParticipantStatus.STARTED)
                + contestParticipantRepository.countByContestIdAndStatus(contestId, ContestParticipantStatus.COMPLETED);

        List<Submission> submissions = submissionRepository.findByContestId(contestId);
        long totalSubmissions = submissions.size();

        Map<String, Long> breakdown = new HashMap<>();
        for (SubmissionStatus status : SubmissionStatus.values()) {
            breakdown.put(status.name(), 0L);
        }

        for (Submission sub : submissions) {
            String statusName = sub.getStatus().name();
            breakdown.put(statusName, breakdown.getOrDefault(statusName, 0L) + 1);
        }

        return ContestStatistics.builder()
                .contestId(contestId)
                .totalEnrolled(enrolled)
                .totalActive(active)
                .totalSubmissions(totalSubmissions)
                .submissionsBreakdown(breakdown)
                .build();
    }
}
