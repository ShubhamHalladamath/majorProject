package shub.smartContest.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shub.smartContest.dto.problem.ContestProblemRequest;
import shub.smartContest.dto.problem.ContestProblemResponse;
import shub.smartContest.dto.problem.ProblemRequest;
import shub.smartContest.dto.problem.ProblemResponse;
import shub.smartContest.entity.Contest;
import shub.smartContest.entity.ContestProblem;
import shub.smartContest.entity.Problem;
import shub.smartContest.exception.ResourceNotFoundException;
import shub.smartContest.repository.ContestProblemRepository;
import shub.smartContest.repository.ContestRepository;
import shub.smartContest.repository.ProblemRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final ContestProblemRepository contestProblemRepository;
    private final ContestRepository contestRepository;

    public ProblemService(ProblemRepository problemRepository,
            ContestProblemRepository contestProblemRepository,
            ContestRepository contestRepository) {
        this.problemRepository = problemRepository;
        this.contestProblemRepository = contestProblemRepository;
        this.contestRepository = contestRepository;
    }

    public ProblemResponse createProblem(ProblemRequest request, Long adminId) {
        Problem problem = Problem.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .constraints(request.getConstraints())
                .inputFormat(request.getInputFormat())
                .outputFormat(request.getOutputFormat())
                .difficulty(request.getDifficulty())
                .createdBy(adminId)
                .build();
        Problem saved = problemRepository.save(problem);
        return mapToResponse(saved);
    }

    public List<ProblemResponse> getAllProblems() {
        return problemRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ProblemResponse getProblemById(Long problemId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found with id: " + problemId));
        return mapToResponse(problem);
    }

    public ProblemResponse updateProblem(Long problemId, ProblemRequest request) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found with id: " + problemId));

        problem.setTitle(request.getTitle());
        problem.setDescription(request.getDescription());
        problem.setConstraints(request.getConstraints());
        problem.setInputFormat(request.getInputFormat());
        problem.setOutputFormat(request.getOutputFormat());
        problem.setDifficulty(request.getDifficulty());

        Problem updated = problemRepository.save(problem);
        return mapToResponse(updated);
    }

    public void deleteProblem(Long problemId) {
        if (!problemRepository.existsById(problemId)) {
            throw new ResourceNotFoundException("Problem not found with id: " + problemId);
        }
        problemRepository.deleteById(problemId);
    }

    public ContestProblemResponse addProblemToContest(Long contestId, ContestProblemRequest request) {
        if (!contestRepository.existsById(contestId)) {
            throw new ResourceNotFoundException("Contest not found with id: " + contestId);
        }
        Problem problem = problemRepository.findById(request.getProblemId())
                .orElseThrow(
                        () -> new ResourceNotFoundException("Problem not found with id: " + request.getProblemId()));

        if (contestProblemRepository.existsByContestIdAndProblemId(contestId, request.getProblemId())) {
            throw new IllegalArgumentException("Problem is already associated with this contest");
        }

        ContestProblem contestProblem = ContestProblem.builder()
                .contestId(contestId)
                .problemId(request.getProblemId())
                .displayOrder(request.getDisplayOrder())
                .points(request.getPoints())
                .build();
        ContestProblem saved = contestProblemRepository.save(contestProblem);

        return mapToContestProblemResponse(saved, problem.getTitle(), problem.getDifficulty());
    }

    @Transactional
    public void removeProblemFromContest(Long contestId, Long problemId) {
        if (!contestProblemRepository.existsByContestIdAndProblemId(contestId, problemId)) {
            throw new ResourceNotFoundException("Problem not found in contest");
        }
        contestProblemRepository.deleteByContestIdAndProblemId(contestId, problemId);
    }

    public List<ContestProblemResponse> getContestProblems(Long contestId) {
        if (!contestRepository.existsById(contestId)) {
            throw new ResourceNotFoundException("Contest not found with id: " + contestId);
        }
        List<ContestProblem> mappings = contestProblemRepository.findByContestIdOrderByDisplayOrderAsc(contestId);
        return mappings.stream().map(mapping -> {
            Problem problem = problemRepository.findById(mapping.getProblemId()).orElse(null);
            String title = problem != null ? problem.getTitle() : "Unknown";
            String diff = problem != null ? problem.getDifficulty() : "Unknown";
            return mapToContestProblemResponse(mapping, title, diff);
        }).collect(Collectors.toList());
    }

    private ProblemResponse mapToResponse(Problem problem) {
        return ProblemResponse.builder()
                .id(problem.getId())
                .title(problem.getTitle())
                .description(problem.getDescription())
                .constraints(problem.getConstraints())
                .inputFormat(problem.getInputFormat())
                .outputFormat(problem.getOutputFormat())
                .difficulty(problem.getDifficulty())
                .build();
    }

    private ContestProblemResponse mapToContestProblemResponse(ContestProblem mapping, String title,
            String difficulty) {
        return ContestProblemResponse.builder()
                .id(mapping.getId())
                .contestId(mapping.getContestId())
                .problemId(mapping.getProblemId())
                .title(title)
                .difficulty(difficulty)
                .displayOrder(mapping.getDisplayOrder())
                .points(mapping.getPoints())
                .build();
    }
}
