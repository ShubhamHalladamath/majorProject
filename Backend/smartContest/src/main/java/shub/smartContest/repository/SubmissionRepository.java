package shub.smartContest.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import shub.smartContest.entity.Submission;

import java.util.List;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByUserId(Long userId);
    List<Submission> findByContestId(Long contestId);
    List<Submission> findByContestIdAndUserId(Long contestId, Long userId);
    List<Submission> findByContestIdAndProblemId(Long contestId, Long problemId);
}

