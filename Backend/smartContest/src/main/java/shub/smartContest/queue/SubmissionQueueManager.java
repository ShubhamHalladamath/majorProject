package shub.smartContest.queue;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import shub.smartContest.config.WorkerConfig;
import shub.smartContest.dto.SubmissionJob;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class SubmissionQueueManager {

    private final WorkerConfig workerConfig;
    private final List<BlockingQueue<SubmissionJob>> workerQueues = new ArrayList<>();
    private final AtomicInteger nextWorker = new AtomicInteger(0);
    private int workerCount;

    public SubmissionQueueManager(WorkerConfig workerConfig) {
        this.workerConfig = workerConfig;
    }

    @PostConstruct
    public void init() {
        this.workerCount = workerConfig.getWorkers();
        int totalCapacity = workerConfig.getQueueCapacity();
        int individualCapacity = Math.max(1, totalCapacity / workerCount);

        for (int i = 0; i < workerCount; i++) {
            workerQueues.add(new LinkedBlockingQueue<>(individualCapacity));
        }
    }

    public boolean enqueue(SubmissionJob job) {
        int workerIndex = nextWorker.getAndUpdate(i -> (i + 1) % workerCount);
        BlockingQueue<SubmissionJob> queue = workerQueues.get(workerIndex);
        return queue.offer(job);
    }

    public BlockingQueue<SubmissionJob> getQueueForWorker(int workerIndex) {
        if (workerIndex < 0 || workerIndex >= workerQueues.size()) {
            throw new IllegalArgumentException("Invalid worker index: " + workerIndex);
        }
        return workerQueues.get(workerIndex);
    }

    public int getWorkerCount() {
        return workerCount;
    }
}
