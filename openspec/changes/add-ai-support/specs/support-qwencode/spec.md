# Capability: Support Qwencode

## Context
Qwencode is a CLI tool for Qwen models. Users should be able to configure SpecLife to use it for `speclife_implement` or the `/openspec-apply` loop.

## ADDED Requirements

### Requirement: Qwencode Configuration
The system MUST accept `qwencode` as a valid implementation mode.

#### Scenario: Validating Config
Given a config with `implementMode: 'qwencode'`
When `loadConfig` is called
Then it should not throw a validation error

#### Scenario: Detecting Qwencode
Given the `qwencode` binary is in the PATH
When `speclife init` is run
Then it should offer Qwencode as an editor/tool option
