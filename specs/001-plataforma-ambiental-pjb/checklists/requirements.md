# Specification Quality Checklist: NIDO PJB

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-28
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Iteración 2 de validación — 2026-08-28: 16 de 16 ítems superados.**

En la iteración 1 el único ítem no superado era "No [NEEDS CLARIFICATION] markers remain", con 3 marcadores abiertos. El equipo los resolvió y quedaron incorporados a la especificación:

- **FR-001** → el proyecto se llama **NIDO PJB** (*Nodo de Investigación y Datos Observados del Instituto Salesiano Pedro Justo Berrío*).
- **FR-011** → acceso por correo institucional con dominio configurable; alta manual de los 10 integrantes por el responsable, sin autorregistro (FR-013a).
- **FR-030** → los alias personales del histórico se vinculan al correo institucional de su titular, y la vinculación queda auditable (FR-030a).

La decisión sobre el formulario actual (reemplazo con importación de respaldo permanente) añadió FR-031a, FR-031b, FR-031c y SC-015.

### Datos pendientes de entrega del equipo

No son marcadores de ambigüedad ni bloquean la planeación, pero se necesitan antes de ejecutar la migración:

1. Lista de los 10 correos institucionales autorizados.
2. ~~Correspondencia entre los alias del histórico y sus titulares.~~ **Resuelto el 2026-09-02.** El archivo trae 8 alias, no 7. Cinco quedaron vinculados; dos no tienen titular identificado y el equipo decidió descartarlos, con sus 19 mediciones importadas sin autor; el octavo (`luis.tapia@udea.edu.co`) no es un alias de estudiante sino un correo externo de la hoja en bruto, que la importación no lee. Se añadieron FR-030b y la migración `0006`.
3. Nombre real del lugar anotado como `Op` en 12 registros históricos.

### Riesgo abierto

El dominio de los correos institucionales se asumió como `@salesianos.edu.co` (ver A-006), distinto del dominio de publicación de la aplicación, `institutopedrojustoberrio.com`. FR-011 lo trata como valor configurable, así que un cambio no afecta al alcance; conviene confirmarlo antes de las pruebas de acceso.

La especificación queda lista para `/speckit-plan`.
