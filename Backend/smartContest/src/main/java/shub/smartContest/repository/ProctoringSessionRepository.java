package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shub.smartContest.entity.ProctoringSession;
import java.util.Optional;
import java.util.List;

public interface ProctoringSessionRepository extends JpaRepository<ProctoringSession, Long> {
    Optional<ProctoringSession> findByPairingToken(String pairingToken);
    Optional<ProctoringSession> findByContestIdAndStudentId(Long contestId, Long studentId);
    List<ProctoringSession> findByContestId(Long contestId);
}
