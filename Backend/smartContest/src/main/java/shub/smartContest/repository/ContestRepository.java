package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shub.smartContest.entity.Contest;
import shub.smartContest.entity.ContestStatus;
import java.util.List;

public interface ContestRepository extends JpaRepository<Contest, Long> {
    List<Contest> findByStatusIn(List<ContestStatus> statuses);
}
