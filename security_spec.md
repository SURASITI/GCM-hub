# Security Specification - InnoHub

## Data Invariants
1. A project must have a valid ownerId matching the creator.
2. Only the owner or an admin can delete/update a project (with specific field restrictions).
3. Comments belong to a project and must have a valid author.
4. votes and comments count should be restricted to atomic increments if possible, but for this simple hub, we'll allow updates with validation.

## Dirty Dozen Payloads (Rejection Targets)
1. Project with faked ownerId.
2. Project update by non-owner.
3. Project deletion by non-owner.
4. Admin field injection (if we had roles).
5. Massive string injection in IDs or fields.
6. Spoofed created time.
7. Modifying ownerId after creation.
8. Project with missing required fields.
9. Comment with fake author info.
10. Update project description of a project owned by someone else.
11. List all projects without being signed in (if privacy was required, here we might allow public view, but user said "บังคับให้ใช้ Google account" so maybe signed in is required).
12. Commenting on a project that doesn't exist.

## Firestore Rules
Drafting in `firestore.rules`...
