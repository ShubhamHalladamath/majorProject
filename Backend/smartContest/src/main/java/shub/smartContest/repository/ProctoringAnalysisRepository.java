package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shub.smartContest.entity.ProctoringAnalysis;
import java.util.List;

public interface ProctoringAnalysisRepository extends JpaRepository<ProctoringAnalysis, Long> {
    List<ProctoringAnalysis> findBySessionId(Long sessionId);
}
