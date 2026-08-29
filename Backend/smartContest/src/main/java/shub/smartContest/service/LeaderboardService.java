package shub.smartContest.service;

import org.springframework.stereotype.Service;
import shub.smartContest.dto.leaderboard.LeaderboardRow;
import shub.smartContest.entity.*;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.repository.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LeaderboardService {

    private final ContestRepository contestRepository;
    private final ContestParticipantRepository contestParticipantRepository;
    private final SubmissionRepository submissionRepository;
    private final UserRepository userRepository;

    public LeaderboardService(ContestRepository contestRepository,
                              ContestParticipantRepository contestParticipantRepository,
                              SubmissionRepository submissionRepository,
                              UserRepository userRepository) {
        this.contestRepository = contestRepository;
        this.contestParticipantRepository = contestParticipantRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
    }

    public List<LeaderboardRow> getLeaderboard(Long contestId) {
        if (!contestRepository.existsById(contestId)) {
            throw new ResourceNotFoundException("Contest not found with id: " + contestId);
        }

        List<ContestParticipant> participants = contestParticipantRepository.findByContestId(contestId);
        List<LeaderboardRow> rows = new ArrayList<>();

        for (ContestParticipant participant : participants) {
            User user = userRepository.findById(participant.getUserId()).orElse(null);
            String username = user != null ? user.getUsername() : "Unknown";

            List<Submission> submissions = submissionRepository.findByContestIdAndUserId(contestId, participant.getUserId());
            
            // Group by problemId to find max score per problem
            Map<Long, Integer> maxScorePerProblem = new HashMap<>();
            Set<Long> solvedProblems = new HashSet<>();
            LocalDateTime lastSubTime = null;

            for (Submission s : submissions) {
                if (s.getStatus() == SubmissionStatus.ACCEPTED) {
                    solvedProblems.add(s.getProblemId());
                }
                
                int currentScore = s.getScore() != null ? s.getScore() : 0;
                maxScorePerProblem.put(s.getProblemId(), Math.max(maxScorePerProblem.getOrDefault(s.getProblemId(), 0), currentScore));

                if (s.getCreatedAt() != null) {
                    if (lastSubTime == null || s.getCreatedAt().isAfter(lastSubTime)) {
                        lastSubTime = s.getCreatedAt();
                    }
                }
            }

            int totalScore = maxScorePerProblem.values().stream().mapToInt(Integer::intValue).sum();
            int problemsSolved = solvedProblems.size();
            int submissionCount = submissions.size();

            rows.add(LeaderboardRow.builder()
                    .userId(participant.getUserId())
                    .username(username)
                    .score(totalScore)
                    .problemsSolved(problemsSolved)
                    .submissionCount(submissionCount)
                    .lastSubmissionTime(lastSubTime)
                    .build());
        }

        // Sort rows: 
        // 1. Score desc
        // 2. Problems solved desc
        // 3. Last submission time asc (earlier is better)
        // 4. Username asc
        rows.sort((a, b) -> {
            int scoreCompare = Integer.compare(b.getScore(), a.getScore());
            if (scoreCompare != 0) return scoreCompare;

            int solvedCompare = Integer.compare(b.getProblemsSolved(), a.getProblemsSolved());
            if (solvedCompare != 0) return solvedCompare;

            if (a.getLastSubmissionTime() != null && b.getLastSubmissionTime() != null) {
                int timeCompare = a.getLastSubmissionTime().compareTo(b.getLastSubmissionTime());
                if (timeCompare != 0) return timeCompare;
            } else if (a.getLastSubmissionTime() != null) {
                return 1;
            } else if (b.getLastSubmissionTime() != null) {
                return -1;
            }

            return a.getUsername().compareTo(b.getUsername());
        });

        // Assign ranks
        for (int i = 0; i < rows.size(); i++) {
            rows.get(i).setRank(i + 1);
        }

        return rows;
    }
}
