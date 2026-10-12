# Spec Delta

## Purpose

Lets customers get a clear, preliminary material-cost estimate for a room using its dimensions and the current price of a selected stone product.

## ADDED Requirements

### Requirement: Calculate room area and material estimate
The system MUST calculate area from room length and width in feet and multiply that area by the selected stone's price per square foot.

#### Scenario: Calculate an estimate
- **WHEN** a customer enters positive room dimensions and selects a priced stone
- **THEN** the system shows the room area in square feet and the estimated material cost in the configured currency

#### Scenario: Recalculate after an input changes
- **WHEN** the customer changes either dimension or selects a different stone
- **THEN** the displayed area and estimated cost update using the current values

### Requirement: Reject unusable dimensions
The system MUST require finite, positive room dimensions before presenting an estimate as valid.

#### Scenario: Dimension is zero or negative
- **WHEN** a customer enters a zero or negative dimension
- **THEN** the system identifies the invalid input and does not present a valid estimate

#### Scenario: Dimension is not a number
- **WHEN** a customer enters a non-numeric or non-finite dimension
- **THEN** the system identifies the invalid input and does not present a valid estimate

### Requirement: Identify estimate limitations
The system MUST label the calculated amount as an estimate for stone material and MUST communicate that it excludes unconfigured services, taxes, and wastage allowances.

#### Scenario: Customer reviews the estimate
- **WHEN** the system displays an estimate
- **THEN** the customer can see that it is an estimate and that additional charges or material allowances may apply
