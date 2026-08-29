package shub.smartContest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import shub.smartContest.config.WorkerConfig;
import shub.smartContest.controller.SubmissionController;
import shub.smartContest.dto.*;
import shub.smartContest.entity.Submission;
import shub.smartContest.entity.SubmissionStatus;
import shub.smartContest.entity.TestCase;
import shub.smartContest.exception.SystemBusyException;
import shub.smartContest.queue.SubmissionQueueManager;
import shub.smartContest.repository.SubmissionRepository;
import shub.smartContest.repository.TestCaseRepository;
import shub.smartContest.service.Judge0Service;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.BlockingQueue;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
public class SubmissionIntegrationTests {

    @Autowired
    private SubmissionController submissionController;

    @Autowired
    private TestCaseRepository testCaseRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @MockitoBean
    private Judge0Service judge0Service;

    @BeforeEach
    void setup() {
        testCaseRepository.deleteAll();
        submissionRepository.deleteAll();
    }

    @Test
    void testRoundRobinRoutingLogic() {
        // Setup queue manager with 4 workers and 8 capacity
        WorkerConfig config = new WorkerConfig();
        config.setWorkers(4);
        config.setQueueCapacity(8);
        SubmissionQueueManager manager = new SubmissionQueueManager(config);
        manager.init();

        for (int i = 0; i < 8; i++) {
            SubmissionJob job = new SubmissionJob((long) i, 10L, "code", 62);
            boolean success = manager.enqueue(job);
            assertTrue(success);
        }

        for (int i = 0; i < 4; i++) {
            BlockingQueue<SubmissionJob> queue = manager.getQueueForWorker(i);
            assertEquals(2, queue.size());

            SubmissionJob first = queue.poll();
            assertNotNull(first);
            assertEquals((long) i, first.submissionId());

            SubmissionJob second = queue.poll();
            assertNotNull(second);
            assertEquals((long) (i + 4), second.submissionId());
        }

    }

    @Test
    void testQueueBackpressure() {
        // Set queue capacity to small
        WorkerConfig config = new WorkerConfig();
        config.setWorkers(2);
        config.setQueueCapacity(2); // 1 job per queue
        SubmissionQueueManager manager = new SubmissionQueueManager(config);
        manager.init();

        // Enqueue 2 jobs successfully
        assertTrue(manager.enqueue(new SubmissionJob(1L, 10L, "code", 62)));
        assertTrue(manager.enqueue(new SubmissionJob(2L, 10L, "code", 62)));

        // 3rd job should fail to enqueue because it goes to worker 0 whose queue is full (size 1)
        assertFalse(manager.enqueue(new SubmissionJob(3L, 10L, "code", 62)));
    }

    @Test
    void testSubmitCodeSuccessfullyQueued() {
        // Create a testcase
        TestCase tc = TestCase.builder()
                .problemId(10L)
                .input("5 10")
                .expectedOutput("15")
                .build();
        testCaseRepository.save(tc);

        SubmitRequest request = new SubmitRequest(10L, "public class Main {}", 62);

        ResponseEntity<SubmitResponse> response = submissionController.submitCode(request);
        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertNotNull(response.getBody().getSubmissionId());
        assertEquals("QUEUED", response.getBody().getStatus());
    }

    @Test
    void testGetSubmissionResultNotFound() {
        assertThrows(RuntimeException.class, () -> {
            submissionController.getSubmissionResult(99999L);
        });
    }

    @Test
    void testCreateTestCasesBatch() {
        TestCase tc1 = TestCase.builder().problemId(20L).input("1 2").expectedOutput("3").build();
        TestCase tc2 = TestCase.builder().problemId(20L).input("3 4").expectedOutput("7").build();
        
        ResponseEntity<List<TestCase>> response = submissionController.createTestCasesBatch(List.of(tc1, tc2));
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        
        List<TestCase> saved = testCaseRepository.findByProblemId(20L);
        assertEquals(2, saved.size());
    }
}

