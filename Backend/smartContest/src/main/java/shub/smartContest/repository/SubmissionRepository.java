package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import shub.smartContest.entity.Submission;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
}
