# Clean Architecture Review Checklist

Use this checklist during PR reviews to ensure alignment with the Clean Architecture doctrine.

## Domain & Application Layers
- [ ] Domain entities are free of framework-specific annotations/types (e.g., no SwiftData, SQL, or JSON tags in core domain).
- [ ] Use cases own the application policy and orchestrate the flow.
- [ ] Dependencies of use cases are expressed as ports (interfaces/protocols).

## Interface Adapters
- [ ] Adapters translate external shapes into domain/application shapes.
- [ ] ViewModels are strictly for presentation logic.
- [ ] Repository implementations handle the messy details of persistence.

## Frameworks & Drivers
- [ ] The "Main" component handles the wiring (Dependency Injection).
- [ ] External SDKs are hidden behind ports.

## Test Boundary
- [ ] Business rules have focused unit tests that don't require a database or network.
- [ ] Mocks/Stubs are used for ports.
