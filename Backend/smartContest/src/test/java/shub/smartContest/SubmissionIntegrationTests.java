package shub.smartContest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.test.context.support.WithMockUser;
import shub.smartContest.admin.AdminTestCaseController;
import shub.smartContest.config.WorkerConfig;
import shub.smartContest.controller.SubmissionController;
import shub.smartContest.dto.*;
import shub.smartContest.entity.TestCase;
import shub.smartContest.queue.SubmissionQueueManager;
import shub.smartContest.repository.*;
import shub.smartContest.service.Judge0Service;

import java.util.List;
import java.util.concurrent.BlockingQueue;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class SubmissionIntegrationTests {

    @Autowired
    private SubmissionController submissionController;

    @Autowired
    private AdminTestCaseController adminTestCaseController;

    @Autowired
    private TestCaseRepository testCaseRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ContestRepository contestRepository;

    @Autowired
    private ContestParticipantRepository contestParticipantRepository;

    @Autowired
    private ContestProblemRepository contestProblemRepository;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private Judge0Service judge0Service;

    @BeforeEach
    void setup() {
        submissionRepository.deleteAll();
        testCaseRepository.deleteAll();
        contestParticipantRepository.deleteAll();
        contestProblemRepository.deleteAll();
        contestRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void testRoundRobinRoutingLogic() {
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
        WorkerConfig config = new WorkerConfig();
        config.setWorkers(2);
        config.setQueueCapacity(2);
        SubmissionQueueManager manager = new SubmissionQueueManager(config);
        manager.init();

        assertTrue(manager.enqueue(new SubmissionJob(1L, 10L, "code", 62)));
        assertTrue(manager.enqueue(new SubmissionJob(2L, 10L, "code", 62)));
        assertFalse(manager.enqueue(new SubmissionJob(3L, 10L, "code", 62)));
    }

    @Test
    @WithMockUser(username = "testuser", roles = "USER")
    void testSubmitCodeSuccessfullyQueued() {
        shub.smartContest.entity.User user = shub.smartContest.entity.User.builder()
                .username("testuser")
                .email("testuser@example.com")
                .password("password")
                .role(shub.smartContest.entity.Role.USER)
                .enabled(true)
                .build();
        user = userRepository.save(user);

        shub.smartContest.entity.Contest contest = shub.smartContest.entity.Contest.builder()
                .title("Test Contest")
                .description("Desc")
                .startTime(java.time.LocalDateTime.now().minusHours(1))
                .endTime(java.time.LocalDateTime.now().plusHours(2))
                .status(shub.smartContest.entity.ContestStatus.LIVE)
                .createdBy(1L)
                .duration(120)
                .build();
        contest = contestRepository.save(contest);

        shub.smartContest.entity.ContestProblem contestProblem = shub.smartContest.entity.ContestProblem.builder()
                .contestId(contest.getId())
                .problemId(10L)
                .displayOrder(1)
                .points(100)
                .build();
        contestProblemRepository.save(contestProblem);

        shub.smartContest.entity.ContestParticipant participant = shub.smartContest.entity.ContestParticipant.builder()
                .contestId(contest.getId())
                .userId(user.getId())
                .enrolledAt(java.time.LocalDateTime.now())
                .startedAt(java.time.LocalDateTime.now())
                .status(shub.smartContest.entity.ContestParticipantStatus.STARTED)
                .build();
        contestParticipantRepository.save(participant);

        TestCase tc = TestCase.builder()
                .problemId(10L)
                .input("5 10")
                .expectedOutput("15")
                .build();
        testCaseRepository.save(tc);

        SubmitRequest request = new SubmitRequest(10L, "public class Main {}", 62, contest.getId());

        ResponseEntity<SubmitResponse> response = submissionController.submitCode(request);
        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertNotNull(response.getBody().getSubmissionId());
        assertEquals("QUEUED", response.getBody().getStatus());
    }

    @Test
    @WithMockUser(username = "testuser", roles = "USER")
    void testGetSubmissionResultNotFound() {
        // First build a user in DB for the mocked session user ID lookup
        shub.smartContest.entity.User user = shub.smartContest.entity.User.builder()
                .username("testuser")
                .email("testuser@example.com")
                .password("password")
                .role(shub.smartContest.entity.Role.USER)
                .enabled(true)
                .build();
        userRepository.save(user);

        assertThrows(RuntimeException.class, () -> {
            submissionController.getSubmissionResult(99999L);
        });
    }

    @Test
    @WithMockUser(username = "adminuser", roles = "ADMIN")
    void testCreateTestCasesBatch() {
        TestCase tc1 = TestCase.builder().problemId(20L).input("1 2").expectedOutput("3").build();
        TestCase tc2 = TestCase.builder().problemId(20L).input("3 4").expectedOutput("7").build();
        
        ResponseEntity<List<TestCase>> response = adminTestCaseController.createTestCasesBatch(20L, List.of(tc1, tc2));
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        
        List<TestCase> saved = testCaseRepository.findByProblemId(20L);
        assertEquals(2, saved.size());
    }
}
