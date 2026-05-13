# Capability: Support Antigravity

## Context
Antigravity is an advanced agentic environment.

## ADDED Requirements

### Requirement: Antigravity Configuration
The system MUST accept `antigravity` as a valid AI provider and implementation mode.

#### Scenario: Validating Config
Given a config with `aiProvider: 'antigravity'`
When `loadConfig` is called
Then it should not throw a validation error

### Requirement: Validating Implement Mode
The system MUST validate `antigravity` implementation mode correctly.

#### Scenario: Validating Implement Mode
Given a config with `implementMode: 'antigravity'`
When `loadConfig` is called
Then it should not throw a validation error

### Requirement: Detecting Antigravity
The system MUST automatically detect the Antigravity environment.

#### Scenario: Detecting Antigravity
Given the environment has `ANTIGRAVITY_AGENT` set
When `speclife init` is run
Then it should detect 'Antigravity'
And it should default the selection to Antigravity
