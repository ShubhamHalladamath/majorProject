package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shub.smartContest.entity.ContestParticipant;
import shub.smartContest.entity.ContestParticipantStatus;
import java.util.List;
import java.util.Optional;

public interface ContestParticipantRepository extends JpaRepository<ContestParticipant, Long> {
    Optional<ContestParticipant> findByContestIdAndUserId(Long contestId, Long userId);
    boolean existsByContestIdAndUserId(Long contestId, Long userId);
    List<ContestParticipant> findByContestId(Long contestId);
    long countByContestId(Long contestId);
    long countByContestIdAndStatus(Long contestId, ContestParticipantStatus status);
}
