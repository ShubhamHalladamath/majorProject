package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shub.smartContest.entity.ProctoringEvent;
import java.util.List;

public interface ProctoringEventRepository extends JpaRepository<ProctoringEvent, Long> {
    List<ProctoringEvent> findBySessionIdOrderByEventTimeAsc(Long sessionId);
}
