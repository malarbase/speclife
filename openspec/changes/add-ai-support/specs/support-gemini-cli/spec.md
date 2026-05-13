# Capability: Support Gemini CLI

## Context
Google's Gemini CLI provides access to Gemini models.

## ADDED Requirements

### Requirement: Gemini CLI Configuration
The system MUST accept `gemini-cli` as a valid implementation mode.

#### Scenario: Validating Config
Given a config with `implementMode: 'gemini-cli'`
When `loadConfig` is called
Then it should not throw a validation error

#### Scenario: Detecting Gemini CLI
Given the `gemini` binary is in the PATH
When `speclife init` is run
Then it should offer Gemini CLI as an editor/tool option
