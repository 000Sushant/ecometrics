# ADR 0001: Clean Architecture Implementation

## Status
Approved

## Context
We need a structure that allows decoupled components, clear separations of concerns, and ease of testing. Specifically, the business logic (Gemini analysis, article calculations) must not be coupled to the details of the web framework, Firebase DB, or Gemini APIs.

## Decision
We will employ **Clean Architecture** patterns separated into:
1. **Domain Layer**: Core logic and entities (e.g. `NewsArticle`, `ImpactReport`) with no dependencies.
2. **Application Layer**: Use Cases (e.g., `AnalyzeNewsImpact`) that orchestrate requests and business logic.
3. **Infrastructure Layer**: Concrete implementations of databases (Firebase/Firestore) and API integrations (Gemini, NewsAPI).
4. **Main/UI Layer**: Server entry points and Web UI client interfaces.

## Consequences
- Highly mockable interfaces for database and third-party APIs.
- Clean separation of business logic from framework details, easing standard Node/Jest and Angular testing.
