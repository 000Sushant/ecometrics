# ADR 0002: Angular State Management

## Status
Approved

## Context
For the Angular frontend, we need to manage the reactive state of the impact feed, active article reports, and animation configuration states without adding heavy state libraries like NgRx if not required, but while keeping logic clean and high-performing.

## Decision
We will use **Angular Signals** combined with RxJS for API streaming. State will reside in service-level stores using Signals, providing fine-grained reactivity, low overhead, and high compatibility with Angular standalone components and Server-Side Rendering (SSR).

## Consequences
- Clean, localized state with minimal boilerplate.
- Better performance due to avoiding global digest cycles.
- Direct alignment with Angular standalone design best practices.
