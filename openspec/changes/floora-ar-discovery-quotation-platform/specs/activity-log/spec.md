# Spec Delta

## Purpose

Gives project operators a concise, recent history of important catalog and quotation actions so they can understand what has happened in the application.

## ADDED Requirements

### Requirement: Record key application activity
The system MUST record successful quotation submissions and material selection actions as activity entries with an event type, timestamp, and relevant non-sensitive summary.

#### Scenario: Successful quotation submission is recorded
- **WHEN** a quotation request is accepted
- **THEN** a timestamped quotation-submitted entry appears in the activity log

#### Scenario: Material selection is recorded
- **WHEN** a customer selects a stone product for an estimate or quotation
- **THEN** a timestamped material-selected entry identifies the product in the activity log

### Requirement: Review recent activity
The system MUST display recent activity entries in reverse chronological order and show a clear empty state when there are no entries.

#### Scenario: Review populated activity log
- **WHEN** a project operator opens the activity log
- **THEN** the newest activity entry appears first with its event summary and timestamp

#### Scenario: Review empty activity log
- **WHEN** no activity has been recorded
- **THEN** the log communicates that there is no recent activity

### Requirement: Exclude sensitive customer data from activity entries
The system MUST NOT expose customer email addresses or phone numbers in activity log entries.

#### Scenario: Customer submits a quotation
- **WHEN** the activity log shows a quotation-submitted entry
- **THEN** it summarizes the event without displaying the customer's email address or phone number

### Requirement: Keep activity review local to the operator
The system MUST expose activity entries only through the local operator review surface and MUST apply the quotation-review access checks to activity reads.

#### Scenario: Customer cannot read operator activity
- **WHEN** a request to read activity lacks valid local operator access
- **THEN** the system does not return activity entries
