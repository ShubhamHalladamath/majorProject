package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shub.smartContest.entity.ProctoringImage;
import java.util.List;

public interface ProctoringImageRepository extends JpaRepository<ProctoringImage, Long> {
    List<ProctoringImage> findBySessionIdOrderBySequenceNumberAsc(Long sessionId);
}
