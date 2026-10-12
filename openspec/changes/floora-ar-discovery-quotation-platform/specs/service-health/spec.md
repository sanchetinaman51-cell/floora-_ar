# Spec Delta

## Purpose

Provides a lightweight way for operators and deployment platforms to determine whether the Floora AR API process is responding and ready to serve requests.

## ADDED Requirements

### Requirement: Expose an API health check
The system MUST expose a health endpoint that returns a successful response when the API is running and able to serve requests.

#### Scenario: API is healthy
- **WHEN** a deployment checker requests the health endpoint while the API is serving
- **THEN** the endpoint responds successfully with a machine-readable healthy status

#### Scenario: API cannot serve requests
- **WHEN** the health endpoint is requested while the API cannot serve requests
- **THEN** the endpoint returns an unsuccessful status that allows a deployment checker to detect the failure
