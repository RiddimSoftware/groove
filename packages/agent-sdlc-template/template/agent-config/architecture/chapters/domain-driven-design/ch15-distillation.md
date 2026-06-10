# Chapter 15: Distillation

## Overview
This chapter focuses on identifying the most important parts of the system and ensuring they receive the most attention. Not all parts of a software system are equally valuable.

## Key Concepts

### Core Domain
- The Core Domain is the heart of the business. It is what makes the software unique and provides the competitive advantage.
- The best developers should be assigned to the Core Domain.
- The Core Domain must be deeply understood and modeled with high precision.

### Generic Subdomains
- Parts of the system that are necessary but do not provide a competitive advantage (e.g., user authentication, billing, notification sending).
- Do not reinvent the wheel for Generic Subdomains. Buy off-the-shelf software or outsource their development.

### Supporting Subdomains
- Parts of the system that support the Core Domain but are not the Core Domain themselves. They are often custom-built but don't require the intense modeling effort of the Core.

### Distillation Techniques
- **Domain Vision Statement:** A short statement describing the Core Domain and the value it brings.
- **Highlighted Core:** Marking the elements of the Core Domain in the code or documentation so they are easily recognizable.

## Application
- Identify the Core Domain of your project. Are you spending most of your time on it, or are you distracted by generic infrastructure?
- If you are building a custom logging framework, you are likely working on a Generic Subdomain instead of the Core Domain. Stop.
- Ensure the Core Domain model is the cleanest and most expressive part of the codebase.
