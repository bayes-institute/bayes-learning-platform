# Firestore data-model scratchpad

**Status:** intentionally undecided. Complete this after course, quiz, enrolment and progress behaviour is agreed.

This document is a planning tool, not a schema specification. The design must be led by the screens and queries the platform needs, then tested with Firestore Rules and the Emulator Suite before implementation.

## Non-negotiable design constraints

- A learner must be able to read and change only data they are authorized to access.
- Course catalogue/content that is public and slow-changing should be cacheable without fetching user data.
- A dashboard must not need to read every historic lesson, quiz attempt or event to show a summary.
- Quiz submission, entitlement changes, publishing, payments and other privileged changes need idempotency and may belong in FastAPI.
- We should estimate the documents read by each screen, not only the number of HTTP requests.
- Denormalization is acceptable only when there is a documented source of truth and update path.
- Avoid storing sensitive answer keys or authorization decisions in browser-local storage or a publicly readable document.

## Questions to answer before choosing collections

1. Which course fields are public before sign-in, and which are visible only after enrolment?
2. Can a learner enrol in many courses, and can a course have many instructors/cohorts?
3. What is the authoritative definition of completion: lesson views, required quizzes, scores, or instructor approval?
4. Are quiz attempts immutable? What retries, timing, score visibility and answer-review rules apply?
5. Is progress written on every interaction, at checkpoints, or at explicit completion events?
6. Which pages require live updates, and which can use a cached snapshot?
7. Which roles exist, who grants them, and what is the audit requirement for role/entitlement changes?
8. What reporting is required now versus later? Firestore operational data should not be forced to serve every future analytics query.

## Screen-to-query inventory

Fill this out before defining document paths.

| Screen / action | User role | Data read | Data written | Must be real time? | Must be server-authorized? | Expected volume |
| --- | --- | --- | --- | --- | --- | --- |
| Course catalogue | | | | | | |
| Course overview | | | | | | |
| Lesson player | | | | | | |
| Progress dashboard | | | | | | |
| Quiz attempt | | | | | | |
| Quiz submission | | | | | | |
| Instructor course editor | | | | | | |
| Admin / entitlement change | | | | | | |

## Candidate concepts — not yet a selected schema

These are domain concepts to validate; they are not instructions to create these collections as written.

- User profile and role/entitlement record
- Course, module, lesson and versioned content metadata
- Enrolment/cohort membership
- Learner progress summary and append-only learning events where justified
- Quiz definition, attempt and finalized score
- Publisher/admin audit records

## Decision log

| Date | Decision | Reason / supporting query | Consequence |
| --- | --- | --- | --- |
| 2026-10-02 | Do not choose a Firestore schema yet. | The course/quiz/progress requirements and read patterns have not been supplied. | Model design remains the next dedicated planning task. |
