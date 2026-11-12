# SkillPath course catalogue provenance

## Public English course metadata

- Dataset: https://huggingface.co/datasets/azrai99/coursera-course-dataset
- Source CSV: https://huggingface.co/datasets/azrai99/coursera-course-dataset/resolve/main/coursera_course_2024.csv
- Dataset card declares Apache-2.0, English and 6.65k rows.
- Fields ingested: course titles, descriptions, organizations, URLs, skills, rating, level, schedule, and enrolled count where available.
- Derived by SkillPath: category keyword heuristics, a bounded rating/quality proxy, and hour defaults when missing.
- Prerequisite fields in this source are not verified and therefore recorded as missing/unknown, not inferred as factual academic requirements.
- A public catalogue record does not imply that the course is still available, free to enroll in, or endorsed by SkillPath.

## Engineering learning resources

Additional hand-curated verified public resource links from MIT OpenCourseWare:
- https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/
- https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/
- https://ocw.mit.edu/courses/6-011-signals-systems-and-inference-spring-2018/
- https://ocw.mit.edu/courses/6-341-discrete-time-signal-processing-fall-2005/
- https://ocw.mit.edu/courses/res-6-dtsp-discrete-time-signal-processing/
- https://ocw.mit.edu/courses/6-011-introduction-to-communication-control-and-signal-processing-spring-2010/

Estimates of hours, normalized skills and difficulty labels used for these links are curatorial assumptions. They should not be treated as official MIT prerequisites or workload statements.

## Evaluation

The offline evaluation uses five hand-labelled demonstration profiles and synthetic A/B assignments, not a Coursera learner-interaction log. MOOCCubeX was considered but is not imported in this English-language release.

Raw source snapshot is not redistributed here. The generated normalized JSON is built by backend/scripts/build_public_catalog.py and committed with source URLs and record provenance. The underlying courses retain their own third-party terms.
