# Spec Delta

## Purpose

Lets customers discover available marble and stone products with enough pricing and stock information to compare materials before requesting a quote.

## ADDED Requirements

### Requirement: Provide a responsive discovery dashboard
The system MUST present the stone discovery, estimate, quotation entry point, and recent activity in a coherent dashboard that remains usable on narrow and wide screens.

#### Scenario: Use the dashboard on a narrow screen
- **WHEN** a customer opens the dashboard on a narrow mobile viewport
- **THEN** the customer can reach the catalog controls and product details without horizontal page overflow

#### Scenario: Use the dashboard on a wide screen
- **WHEN** a customer opens the dashboard on a wide desktop viewport
- **THEN** the catalog and related discovery tools remain visible and usable in the dashboard layout

### Requirement: Catalog contains a useful starter inventory
The system MUST present at least ten sample stone products, each with a name, category, price per square foot, and availability status.

#### Scenario: Browse the starter inventory
- **WHEN** a customer opens the stone catalog
- **THEN** the system shows at least ten products with each required product detail

### Requirement: Customer can search the catalog
The system MUST let customers search stone products by name using a text query.

#### Scenario: Search for a matching stone
- **WHEN** a customer enters text matching a product name
- **THEN** the catalog shows matching products and excludes non-matching products

#### Scenario: Search has no matches
- **WHEN** a customer enters text that matches no product name
- **THEN** the catalog shows a clear empty-result state

### Requirement: Customer can filter by category
The system MUST let customers limit catalog results to a selected product category and return to all categories.

#### Scenario: Select a category
- **WHEN** a customer selects a category
- **THEN** every displayed product belongs to that category

#### Scenario: Clear the category filter
- **WHEN** a customer selects the all-categories option
- **THEN** products from every category are eligible to appear, subject to the active search query

### Requirement: Catalog communicates availability
The system MUST visibly distinguish products that are available, limited, or unavailable, and customers MUST be able to identify unavailable products before selecting them for a quotation.

#### Scenario: Inspect product availability
- **WHEN** a customer views a product
- **THEN** its availability status is visible alongside its price and category
