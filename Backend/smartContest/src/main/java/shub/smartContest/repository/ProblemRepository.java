package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shub.smartContest.entity.Problem;

public interface ProblemRepository extends JpaRepository<Problem, Long> {
}
