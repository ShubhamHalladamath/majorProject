package shub.smartContest.worker;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import shub.smartContest.config.WorkerConfig;
import shub.smartContest.queue.SubmissionQueueManager;
import shub.smartContest.repository.*;
import shub.smartContest.service.Judge0Service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
@Slf4j
public class RoundRobinWorkerManager {

    private final WorkerConfig workerConfig;
    private final SubmissionQueueManager queueManager;
    private final SubmissionRepository submissionRepository;
    private final TestCaseRepository testCaseRepository;
    private final SubmissionTestResultRepository submissionTestResultRepository;
    private final Judge0Service judge0Service;

    private ExecutorService executorService;

    public RoundRobinWorkerManager(WorkerConfig workerConfig,
                                   SubmissionQueueManager queueManager,
                                   SubmissionRepository submissionRepository,
                                   TestCaseRepository testCaseRepository,
                                   SubmissionTestResultRepository submissionTestResultRepository,
                                   Judge0Service judge0Service) {
        this.workerConfig = workerConfig;
        this.queueManager = queueManager;
        this.submissionRepository = submissionRepository;
        this.testCaseRepository = testCaseRepository;
        this.submissionTestResultRepository = submissionTestResultRepository;
        this.judge0Service = judge0Service;
    }

    @PostConstruct
    public void startWorkers() {
        int workerCount = workerConfig.getWorkers();
        log.info("Initializing RoundRobinWorkerManager with {} workers", workerCount);
        executorService = Executors.newFixedThreadPool(workerCount);

        for (int i = 0; i < workerCount; i++) {
            SubmissionWorker worker = new SubmissionWorker(
                    i + 1,
                    queueManager.getQueueForWorker(i),
                    submissionRepository,
                    testCaseRepository,
                    submissionTestResultRepository,
                    judge0Service,
                    workerConfig
            );
            executorService.submit(worker);
        }
    }

    @PreDestroy
    public void stopWorkers() {
        if (executorService != null) {
            log.info("Shutting down worker threads...");
            executorService.shutdownNow();
        }
    }
}
