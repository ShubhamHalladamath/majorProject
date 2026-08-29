package shub.smartContest.entity;

public enum SubmissionStatus {
    QUEUED,
    JUDGING,
    ACCEPTED,
    WRONG_ANSWER,
    COMPILATION_ERROR,
    RUNTIME_ERROR,
    TIME_LIMIT_EXCEEDED,
    MEMORY_LIMIT_EXCEEDED,
    INTERNAL_ERROR
}
