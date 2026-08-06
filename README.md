# Noam's repository

## Gmail permissions for Claude sessions

`.claude/settings.json` pre-approves the Gmail tools Claude uses for mailbox
cleanup (searching, labelling, archiving, and moving threads to Trash), so a
session can act on hundreds of messages without a confirmation prompt for each
one.

Permission rules are read once when a session starts. Adding them mid-session
has no effect — that is why they live here, in the repository, which is cloned
before the session begins.

To stop auto-approving any of these, delete its line from the `allow` array.
Trashed mail stays recoverable in Gmail for 30 days.
