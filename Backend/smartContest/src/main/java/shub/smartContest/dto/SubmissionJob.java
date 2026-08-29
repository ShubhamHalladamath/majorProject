package shub.smartContest.dto;

public record SubmissionJob(
        Long submissionId,
        Long problemId,
        String sourceCode,
        Integer languageId
) {}
