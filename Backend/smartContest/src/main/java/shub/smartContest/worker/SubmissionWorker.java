package shub.smartContest.worker;

import lombok.extern.slf4j.Slf4j;
import shub.smartContest.config.WorkerConfig;
import shub.smartContest.dto.Judge0Result;
import shub.smartContest.dto.Judge0Submission;
import shub.smartContest.dto.Judge0Token;
import shub.smartContest.dto.SubmissionJob;
import shub.smartContest.entity.*;
import shub.smartContest.repository.*;
import shub.smartContest.service.Judge0Service;

import java.util.*;
import java.util.concurrent.BlockingQueue;
import java.util.stream.Collectors;

@Slf4j
public class SubmissionWorker implements Runnable {

    private final int workerId;
    private final BlockingQueue<SubmissionJob> queue;
    private final SubmissionRepository submissionRepository;
    private final TestCaseRepository testCaseRepository;
    private final SubmissionTestResultRepository submissionTestResultRepository;
    private final Judge0Service judge0Service;
    private final WorkerConfig workerConfig;

    public SubmissionWorker(int workerId,
                            BlockingQueue<SubmissionJob> queue,
                            SubmissionRepository submissionRepository,
                            TestCaseRepository testCaseRepository,
                            SubmissionTestResultRepository submissionTestResultRepository,
                            Judge0Service judge0Service,
                            WorkerConfig workerConfig) {
        this.workerId = workerId;
        this.queue = queue;
        this.submissionRepository = submissionRepository;
        this.testCaseRepository = testCaseRepository;
        this.submissionTestResultRepository = submissionTestResultRepository;
        this.judge0Service = judge0Service;
        this.workerConfig = workerConfig;
    }

    @Override
    public void run() {
        log.info("Worker-{} started and waiting for jobs...", workerId);
        try {
            while (!Thread.currentThread().isInterrupted()) {
                SubmissionJob job = queue.take();
                log.info("Worker-{} processing Job {} (Problem {}, Language {})",
                        workerId, job.submissionId(), job.problemId(), job.languageId());
                try {
                    processSubmission(job);
                } catch (Exception e) {
                    log.error("Error processing Job {} in Worker-{}", job.submissionId(), workerId, e);
                    updateStatus(job.submissionId(), SubmissionStatus.INTERNAL_ERROR, 0, 0, 0, e.getMessage());
                }
            }
        } catch (InterruptedException e) {
            log.info("Worker-{} interrupted, shutting down.", workerId);
            Thread.currentThread().interrupt();
        }
    }

    private void processSubmission(SubmissionJob job) {
        // 1. Mark status as JUDGING
        updateStatus(job.submissionId(), SubmissionStatus.JUDGING, 0, 0, 0, null);

        // 2. Load test cases
        List<TestCase> testCases = testCaseRepository.findByProblemId(job.problemId());
        if (testCases.isEmpty()) {
            log.warn("No test cases found for problem {}", job.problemId());
            updateStatus(job.submissionId(), SubmissionStatus.INTERNAL_ERROR, 0, 0, 0, "No test cases configured for this problem.");
            return;
        }

        // 3. Create Judge0 batch submissions
        List<Judge0Submission> judgeSubmissions = testCases.stream()
                .map(tc -> Judge0Submission.builder()
                        .sourceCode(job.sourceCode())
                        .languageId(job.languageId())
                        .stdin(tc.getInput())
                        .expectedOutput(tc.getExpectedOutput())
                        .build())
                .collect(Collectors.toList());

        List<Judge0Token> tokens;
        try {
            tokens = judge0Service.createBatch(judgeSubmissions);
        } catch (Exception e) {
            log.error("Failed to create batch submission on Judge0", e);
            updateStatus(job.submissionId(), SubmissionStatus.INTERNAL_ERROR, 0, testCases.size(), 0, "Judge0 unavailable: " + e.getMessage());
            return;
        }

        if (tokens == null || tokens.size() != testCases.size()) {
            log.error("Returned tokens size doesn't match test cases size");
            updateStatus(job.submissionId(), SubmissionStatus.INTERNAL_ERROR, 0, testCases.size(), 0, "Invalid response from Judge0");
            return;
        }

        // Map tokens back to TestCases to track which token corresponds to which testcase
        List<String> tokenStrings = tokens.stream().map(Judge0Token::getToken).collect(Collectors.toList());
        Map<String, TestCase> tokenToTestCase = new HashMap<>();
        for (int i = 0; i < tokens.size(); i++) {
            tokenToTestCase.put(tokens.get(i).getToken(), testCases.get(i));
        }

        // 4. Poll Judge0 for results
        long startTime = System.currentTimeMillis();
        long pollDelay = workerConfig.getPollDelayMs();
        long timeout = workerConfig.getPollTimeoutMs();
        
        List<Judge0Result> finalResults = null;
        boolean allFinished = false;

        while (System.currentTimeMillis() - startTime < timeout) {
            try {
                Thread.sleep(pollDelay);
            } catch (InterruptedException e) {
                log.warn("Worker-{} interrupted during polling", workerId);
                Thread.currentThread().interrupt();
                return;
            }

            try {
                List<Judge0Result> currentResults = judge0Service.getBatchResults(tokenStrings);
                
                // Check if all are finished (status id > 2)
                boolean finished = true;
                for (Judge0Result result : currentResults) {
                    if (result.getStatus() == null || result.getStatus().getId() <= 2) {
                        finished = false;
                        break;
                    }
                }
                
                // Check for compile errors early
                boolean hasCompileError = currentResults.stream()
                        .anyMatch(r -> r.getStatus() != null && r.getStatus().getId() == 6);

                if (hasCompileError) {
                    finalResults = currentResults;
                    allFinished = true;
                    break;
                }

                if (finished) {
                    finalResults = currentResults;
                    allFinished = true;
                    break;
                }
            } catch (Exception e) {
                log.error("Error during polling in Worker-{}", workerId, e);
            }
        }

        if (!allFinished) {
            log.error("Polling timed out for Job {}", job.submissionId());
            updateStatus(job.submissionId(), SubmissionStatus.INTERNAL_ERROR, 0, testCases.size(), 0, "Polling timed out");
            return;
        }

        // 5. Process and Aggregate Results
        int passed = 0;
        int total = testCases.size();
        SubmissionStatus overallStatus = SubmissionStatus.ACCEPTED;
        String compilerOutput = null;

        // Check if there is any Compilation Error (status id = 6)
        Optional<Judge0Result> compileErrorResult = finalResults.stream()
                .filter(r -> r.getStatus() != null && r.getStatus().getId() == 6)
                .findFirst();

        if (compileErrorResult.isPresent()) {
            overallStatus = SubmissionStatus.COMPILATION_ERROR;
            compilerOutput = compileErrorResult.get().getCompileOutput();
            if (compilerOutput == null) {
                compilerOutput = compileErrorResult.get().getMessage();
            }
        } else {
            // No compile errors, save individual test case results and aggregate
            List<SubmissionTestResult> testResultsToSave = new ArrayList<>();
            for (int i = 0; i < finalResults.size(); i++) {
                Judge0Result res = finalResults.get(i);
                String token = res.getToken() != null ? res.getToken() : tokenStrings.get(i);
                TestCase tc = tokenToTestCase.get(token);
                if (tc == null) {
                    tc = testCases.get(i);
                }

                String statusDesc = res.getStatus() != null ? res.getStatus().getDescription() : "Unknown";
                int statusId = res.getStatus() != null ? res.getStatus().getId() : -1;

                if (statusId == 3) { // Accepted
                    passed++;
                }

                SubmissionTestResult testResult = SubmissionTestResult.builder()
                        .submissionId(job.submissionId())
                        .testCaseId(tc.getId())
                        .status(statusDesc)
                        .time(res.getTime())
                        .memory(res.getMemory())
                        .stdout(res.getStdout())
                        .stderr(res.getStderr())
                        .message(res.getMessage())
                        .build();
                testResultsToSave.add(testResult);
            }

            // Save all test case results
            submissionTestResultRepository.saveAll(testResultsToSave);

            // Determine overall status
            if (passed == total) {
                overallStatus = SubmissionStatus.ACCEPTED;
            } else {
                overallStatus = SubmissionStatus.WRONG_ANSWER; // Default fallback
                for (int i = 0; i < finalResults.size(); i++) {
                    Judge0Result res = finalResults.get(i);
                    int statusId = res.getStatus() != null ? res.getStatus().getId() : -1;
                    if (statusId != 3) {
                        overallStatus = mapJudge0StatusToSubmissionStatus(statusId);
                        break;
                    }
                }
            }
        }

        // Calculate score
        int score = (passed * 100) / total;

        updateStatus(job.submissionId(), overallStatus, passed, total, score, compilerOutput);
        log.info("Job {} processed. Result: {}, Score: {} ({} of {})",
                job.submissionId(), overallStatus, score, passed, total);
    }

    private void updateStatus(Long submissionId, SubmissionStatus status, int passed, int total, int score, String compilerOutput) {
        Submission submission = submissionRepository.findById(submissionId).orElse(null);
        if (submission != null) {
            submission.setStatus(status);
            submission.setPassed(passed);
            submission.setTotal(total);
            submission.setScore(score);
            submission.setCompilerOutput(compilerOutput);
            submissionRepository.save(submission);
        }
    }

    private SubmissionStatus mapJudge0StatusToSubmissionStatus(int statusId) {
        return switch (statusId) {
            case 3 -> SubmissionStatus.ACCEPTED;
            case 4 -> SubmissionStatus.WRONG_ANSWER;
            case 5 -> SubmissionStatus.TIME_LIMIT_EXCEEDED;
            case 6 -> SubmissionStatus.COMPILATION_ERROR;
            case 7, 8, 9, 10, 11, 12 -> SubmissionStatus.RUNTIME_ERROR;
            case 13 -> SubmissionStatus.INTERNAL_ERROR;
            case 14 -> SubmissionStatus.RUNTIME_ERROR;
            default -> SubmissionStatus.WRONG_ANSWER;
        };
    }
}
