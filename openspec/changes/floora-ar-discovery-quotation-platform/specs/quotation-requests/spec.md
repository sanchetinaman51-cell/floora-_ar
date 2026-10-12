# Spec Delta

## Purpose

Lets a prospective customer send a structured request for a stone quotation so the business can follow up with the correct contact and material details.

## ADDED Requirements

### Requirement: Submit a quotation request with customer and stone details
The system MUST collect a customer's name, email address, phone number, project location, and selected stone product when submitting a quotation request. The customer MAY include notes and room dimensions; when dimensions are provided, both feet values MUST be finite and positive.

#### Scenario: Submit a complete request
- **WHEN** a customer provides all required details and selects an available stone
- **THEN** the system records the request and confirms successful submission

#### Scenario: Include optional project context
- **WHEN** a customer includes notes or both room dimensions with a complete request
- **THEN** the system preserves that context with the accepted request

#### Scenario: Include incomplete or invalid room dimensions
- **WHEN** a customer provides only one room dimension or a non-positive/non-finite value
- **THEN** the system identifies the dimension fields and does not accept the request

### Requirement: Validate quotation request fields
The system MUST validate required customer fields and ensure the selected stone exists and is available for quotation before accepting a request.

#### Scenario: Required customer detail is missing or invalid
- **WHEN** a customer submits with a missing required value or malformed email address
- **THEN** the system identifies the field that needs correction and does not accept the request

#### Scenario: Selected stone is unavailable or unknown
- **WHEN** a customer submits a request for a stone that is unavailable or does not exist
- **THEN** the system explains that the selected stone cannot be quoted and does not accept the request

### Requirement: Preserve submitted quotation requests
The system MUST make an accepted quotation request available for later review after the submission interaction ends.

#### Scenario: Review a previously submitted request
- **WHEN** an authorized project operator reviews quotation requests after a submission
- **THEN** the accepted request's customer and selected-stone details are available

### Requirement: Keep quotation review local-only in the student MVP
The system MUST restrict the quotation review surface to the local project instance and MUST NOT expose customer quotation records through a public customer route.

The local operator API MUST validate loopback origin and a development-only token, MUST be disabled in production, and MUST omit customer email and phone from its review response.

#### Scenario: Operator reviews requests locally
- **WHEN** a project operator reviews submitted requests using the local project instance
- **THEN** the operator can review the accepted customer and selected-stone details

#### Scenario: Public customer opens the application
- **WHEN** a customer uses the public discovery experience
- **THEN** the customer cannot access quotation records or the operator review surface

#### Scenario: Local operator reviews requests with development access
- **WHEN** a loopback request presents the configured development token outside production
- **THEN** the operator can review request identifiers, customer names, stone, project location, optional room dimensions, and submission time without email or phone

#### Scenario: Operator access check fails
- **WHEN** a request is non-loopback, has a missing or invalid token, or runs in production
- **THEN** the API does not return quotation request summaries
