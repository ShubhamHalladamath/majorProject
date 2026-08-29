package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shub.smartContest.entity.ContestProblem;
import java.util.List;
import java.util.Optional;

public interface ContestProblemRepository extends JpaRepository<ContestProblem, Long> {
    List<ContestProblem> findByContestIdOrderByDisplayOrderAsc(Long contestId);
    Optional<ContestProblem> findByContestIdAndProblemId(Long contestId, Long problemId);
    boolean existsByContestIdAndProblemId(Long contestId, Long problemId);
    void deleteByContestIdAndProblemId(Long contestId, Long problemId);
}
