package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import shub.smartContest.entity.SubmissionTestResult;
import java.util.List;

@Repository
public interface SubmissionTestResultRepository extends JpaRepository<SubmissionTestResult, Long> {
    List<SubmissionTestResult> findBySubmissionId(Long submissionId);
}
