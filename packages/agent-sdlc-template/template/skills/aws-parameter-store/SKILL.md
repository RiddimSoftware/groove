---
name: aws-parameter-store
description: Standard procedure for reading, writing, and validating API keys and secrets using AWS Parameter Store.
---

# AWS Parameter Store Secrets Management

This skill dictates how to handle API keys, secrets, and sensitive configuration.

## When to use
Whenever a task requires an API key, looking up an API key, validating an API key exists, or storing a new API key. All API keys and secrets MUST live in AWS Parameter Store.

## Instructions
1. **Canonical Source:** AWS Parameter Store is the single canonical place for all secrets and API keys.
2. **Reading Secrets:** Use the AWS CLI to read secrets. Example: `aws ssm get-parameter --name "/path/to/secret" --with-decryption`
3. **Writing Secrets:** Use the AWS CLI to write secrets. Example: `aws ssm put-parameter --name "/path/to/secret" --value "SECRET_VALUE" --type "SecureString"`
4. **Validation:** Check if a secret exists in AWS Parameter Store before attempting to use it or prompting the user for it.
5. **Security:** **NEVER** print out the actual API key or secret in plain text in the chat, logs, or any markdown output. 
6. **Access:** AWS CLI access is assumed to be already granted to the current LLM session. You do not need to configure AWS credentials unless explicitly told they are missing.
