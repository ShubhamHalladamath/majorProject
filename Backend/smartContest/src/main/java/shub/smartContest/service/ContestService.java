package shub.smartContest.service;

import org.springframework.stereotype.Service;
import shub.smartContest.dto.contest.ContestRequest;
import shub.smartContest.dto.contest.ContestResponse;
import shub.smartContest.entity.Contest;
import shub.smartContest.entity.ContestStatus;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.repository.ContestRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ContestService {

    private final ContestRepository contestRepository;

    public ContestService(ContestRepository contestRepository) {
        this.contestRepository = contestRepository;
    }

    public ContestResponse createContest(ContestRequest request, Long adminId) {
        Contest contest = Contest.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .duration(request.getDuration() != null ? request.getDuration() : 120)
                .status(ContestStatus.DRAFT) // Initially DRAFT
                .createdBy(adminId)
                .build();
        Contest saved = contestRepository.save(contest);
        return mapToResponse(saved);
    }

    public ContestResponse updateContest(Long contestId, ContestRequest request) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found with id: " + contestId));
        
        contest.setTitle(request.getTitle());
        contest.setDescription(request.getDescription());
        contest.setStartTime(request.getStartTime());
        contest.setEndTime(request.getEndTime());
        if (request.getDuration() != null) {
            contest.setDuration(request.getDuration());
        }
        Contest updated = contestRepository.save(contest);
        return mapToResponse(updated);
    }

    public void deleteContest(Long contestId) {
        if (!contestRepository.existsById(contestId)) {
            throw new ResourceNotFoundException("Contest not found with id: " + contestId);
        }
        contestRepository.deleteById(contestId);
    }

    public ContestResponse publishContest(Long contestId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found with id: " + contestId));
        
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(contest.getStartTime())) {
            contest.setStatus(ContestStatus.UPCOMING);
        } else if (now.isAfter(contest.getEndTime())) {
            contest.setStatus(ContestStatus.ENDED);
        } else {
            contest.setStatus(ContestStatus.LIVE);
        }
        Contest updated = contestRepository.save(contest);
        return mapToResponse(updated);
    }

    public ContestResponse cancelContest(Long contestId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found with id: " + contestId));
        contest.setStatus(ContestStatus.CANCELLED);
        Contest updated = contestRepository.save(contest);
        return mapToResponse(updated);
    }

    public List<ContestResponse> getAllContestsForAdmin() {
        return contestRepository.findAll().stream()
                .map(this::checkAndBuildContestStatus)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ContestResponse> getAvailableContestsForUser() {
        // Users can only view published contests (UPCOMING, LIVE, ENDED, CANCELLED). DRAFT is hidden.
        return contestRepository.findAll().stream()
                .map(this::checkAndBuildContestStatus)
                .filter(c -> c.getStatus() != ContestStatus.DRAFT)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ContestResponse getContestDetails(Long contestId, boolean isAdmin) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found with id: " + contestId));
        contest = checkAndBuildContestStatus(contest);
        if (!isAdmin && contest.getStatus() == ContestStatus.DRAFT) {
            throw new ResourceNotFoundException("Contest not found");
        }
        return mapToResponse(contest);
    }

    public Contest checkAndBuildContestStatus(Contest contest) {
        if (contest.getStatus() == ContestStatus.DRAFT || contest.getStatus() == ContestStatus.CANCELLED) {
            return contest;
        }
        LocalDateTime now = LocalDateTime.now();
        ContestStatus targetStatus;
        if (now.isBefore(contest.getStartTime())) {
            targetStatus = ContestStatus.UPCOMING;
        } else if (now.isAfter(contest.getEndTime())) {
            targetStatus = ContestStatus.ENDED;
        } else {
            targetStatus = ContestStatus.LIVE;
        }
        if (contest.getStatus() != targetStatus) {
            contest.setStatus(targetStatus);
            return contestRepository.save(contest);
        }
        return contest;
    }

    private ContestResponse mapToResponse(Contest contest) {
        return ContestResponse.builder()
                .id(contest.getId())
                .title(contest.getTitle())
                .description(contest.getDescription())
                .startTime(contest.getStartTime())
                .endTime(contest.getEndTime())
                .duration(contest.getDuration())
                .status(contest.getStatus())
                .build();
    }
}
