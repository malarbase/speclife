# Add Spec Validation - Tasks

## 1. Core Types
- [x] 1.1 Add `ValidationStatus` type (`pass`, `pass_with_warnings`, `fail`)
- [x] 1.2 Add `ValidationReport` interface with status, errors, warnings, output

## 2. Git Adapter
- [x] 2.1 Add `diff(base: string)` method to GitAdapter interface
- [x] 2.2 Implement diff method using simple-git

## 3. Submit Workflow
- [x] 3.1 Add `skipValidation` and `strict` options to SubmitOptions
- [x] 3.2 Add `validation` field to SubmitResult
- [x] 3.3 Implement validation step using `openspec validate` CLI
- [x] 3.4 Handle validation errors (abort on fail, warn on warnings)
- [x] 3.5 Update `generatePRBody` to include validation section

## 4. MCP Tool
- [x] 4.1 Add `skipValidation` and `strict` args to submit tool schema
- [x] 4.2 Pass validation options to workflow
- [x] 4.3 Display validation results in tool output

## 5. Test Helpers
- [x] 5.1 Add `diff` mock to MockGitAdapter
- [x] 5.2 Update MockGitAdapter interface

## 6. Documentation
- [x] 6.1 Update proposal to reflect openspec validate approach
- [x] 6.2 Mark tasks as complete
