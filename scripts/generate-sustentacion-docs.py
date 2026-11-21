from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

out_dir = Path(__file__).resolve().parents[1] / "docs" / "sustentacion"
out_dir.mkdir(parents=True, exist_ok=True)


def style_doc(doc: Document) -> None:
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.2)
        section.right_margin = Cm(2.2)


def add_title(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(18)
    run.font.color.rgb = RGBColor(0x16, 0x30, 0x2B)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT


def add_subtitle(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.italic = True
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0x5B, 0x6B, 0x66)


def add_h(doc: Document, text: str) -> None:
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(13)
    run.font.color.rgb = RGBColor(0x0F, 0x6B, 0x5C)
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)


def add_p(doc: Document, text: str) -> None:
    p = doc.add_paragraph(text)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15


def add_bullets(doc: Document, items: list[str]) -> None:
    for item in items:
        p = doc.add_paragraph(item, style="List Bullet")
        p.paragraph_format.space_after = Pt(2)


def build_generalidades() -> Path:
    doc = Document()
    style_doc(doc)
    add_title(doc, "Mesa de solicitudes")
    add_subtitle(doc, "Generalidades y definiciones")
    add_p(
        doc,
        "Documento de apoyo para comprender el dominio, el lenguaje de negocio "
        "y los conceptos técnicos usados en la solución.",
    )

    add_h(doc, "1. Contexto de negocio")
    add_p(
        doc,
        "La Mesa de solicitudes es el núcleo de una aplicación multi-tenant para "
        "el centro de servicios compartidos. Las filiales registran, consultan y "
        "confirman solicitudes (compras, nómina, contabilidad) sin depender de un "
        "Excel compartido ni de seguimientos manuales por correo.",
    )

    add_h(doc, "2. Problemas que resuelve")
    add_bullets(
        doc,
        [
            "Visibilidad: la filial conoce el estado de sus solicitudes sin contactar al equipo.",
            "Proceso: los estados no se pueden saltar; el flujo acordado se impone en backend.",
            "Confidencialidad: cada filial solo ve y gestiona lo suyo.",
        ],
    )

    add_h(doc, "3. Definiciones de negocio")
    add_bullets(
        doc,
        [
            "Filial / tenant: organización dueña de las solicitudes. Se identifica con X-Tenant-Id.",
            "Solicitud: requerimiento de servicio con título, descripción, estado y auditoría básica.",
            "Analista: usuario del centro de servicios que atiende y resuelve.",
            "Usuario de filial: crea solicitudes y confirma o rechaza la solución.",
            "Estado: etapa actual de la solicitud dentro del proceso.",
        ],
    )

    add_h(doc, "4. Estados del proceso")
    add_bullets(
        doc,
        [
            "REGISTRADA: solicitud creada; punto de entrada del proceso.",
            "EN_ATENCION: el analista está trabajando la solicitud.",
            "RESUELTA: el analista propone una solución; espera confirmación de la filial.",
            "CERRADA: la filial confirmó; la solicitud queda inmutable.",
        ],
    )

    add_h(doc, "5. Transiciones permitidas")
    add_bullets(
        doc,
        [
            "atender: REGISTRADA → EN_ATENCION (solo analista).",
            "resolver: EN_ATENCION → RESUELTA (solo analista).",
            "confirmar: RESUELTA → CERRADA (solo filial).",
            "rechazar: RESUELTA → EN_ATENCION (solo filial).",
        ],
    )

    add_h(doc, "6. Definiciones técnicas")
    add_bullets(
        doc,
        [
            "Multi-tenant: un mismo sistema sirve a varias filiales con aislamiento de datos.",
            "Clean Architecture: dominio independiente de frameworks; casos de uso orquestan reglas; adapters implementan persistencia y entrega.",
            "SOLID: responsabilidad única, abierto/cerrado, sustitución, segregación de interfaces e inversión de dependencias.",
            "Adapter de persistencia: implementación intercambiable (memory, mysql, dynamodb).",
            "404 opaco: ante acceso cruzado entre tenants se responde igual que si el recurso no existiera.",
            "Seed de volumen: carga controlada de datos de prueba (~50.000) para validar rendimiento de consulta.",
            "SweetAlert2: diálogos de feedback en registro y cambios de estado en la UI.",
            "IaC (CDK): código que describe la infraestructura AWS y se valida con cdk synth.",
        ],
    )

    add_h(doc, "7. Componentes de la solución")
    add_bullets(
        doc,
        [
            "apps/api: backend NestJS + TypeScript (proceso, multi-tenant, seed, 3 adapters).",
            "apps/web: frontend Angular 20 (consulta + registro + transiciones + SweetAlert).",
            "infra: AWS CDK — DynamoDB, API Fargate/ALB, frontend S3/CloudFront.",
            "docker-compose.yml: perfiles locales memory | mysql | dynamodb.",
            ".github/workflows/ci.yml: lint, tests, build y cdk synth.",
        ],
    )

    add_h(doc, "8. Qué hace la infraestructura (resumen)")
    add_bullets(
        doc,
        [
            "DynamoDB: tabla multi-tenant (pk=tenantId, sk=id) + GSI por estado y fecha.",
            "ECS Fargate + ALB: ejecuta la API en contenedores detrás de un balanceador.",
            "S3 + CloudFront: sirve el frontend Angular estático con HTTPS.",
            "IAM: la task de la API puede leer/escribir solo la tabla de solicitudes.",
            "No se despliega en la prueba: solo se valida con cdk synth.",
        ],
    )

    path = out_dir / "01-generalidades-y-definiciones.docx"
    doc.save(path)
    return path


def build_defensa() -> Path:
    doc = Document()
    style_doc(doc)
    add_title(doc, "Mesa de solicitudes")
    add_subtitle(doc, "Explicación y defensa de la solución")
    add_p(
        doc,
        "Guía breve para explicar decisiones, demostrar cumplimiento de criterios "
        "y sostener la arquitectura en la sesión en vivo. Incluye los cambios de UI "
        "de proceso y feedback SweetAlert.",
    )

    add_h(doc, "1. Enfoque general")
    add_p(
        doc,
        "Se construyó el núcleo funcional completo priorizando reglas de negocio en "
        "el dominio, aislamiento multi-tenant demostrable y una consulta usable con "
        "volumen. La identidad se simula por cabeceras (sin IdP). Además de la "
        "consulta, la UI permite ejecutar el proceso completo (crear y transiciones) "
        "para la demo.",
    )

    add_h(doc, "2. Cómo se resolvió cada problema")
    add_p(
        doc,
        "Problema 1 — Visibilidad: pantalla Angular con listado paginado, filtro por "
        "estado y búsqueda por id/título. El backend siempre acota por tenant. Existe "
        "endpoint de seed para ~50.000 solicitudes y la consulta permanece responsiva "
        "gracias a paginación e índices. Vacío y error se muestran con claridad.",
    )
    add_p(
        doc,
        "Problema 2 — Proceso: máquina de estados en RequestProcessPolicy. Solo se "
        "permiten transiciones válidas por rol. Intentos inválidos devuelven 422 con "
        "mensaje claro y no alteran la entidad. Cubierto con pruebas unitarias y e2e. "
        "La UI muestra botones según rol/estado y SweetAlert al registrar o cambiar estado. "
        "En REGISTRADA, la filial ve “Sin acción para este rol” porque quien actúa es el analista.",
    )
    add_p(
        doc,
        "Problema 3 — Confidencialidad: toda lectura/escritura exige tenantId del "
        "contexto. findById(id, tenantId) no distingue “no existe” de “otro tenant” "
        "(mismo 404). Hay pruebas automatizadas de aislamiento en list/get/transition.",
    )

    add_h(doc, "3. Decisiones de arquitectura (por qué)")
    add_bullets(
        doc,
        [
            "Clean Architecture + SOLID: las reglas de proceso viven en dominio; NestJS y DBs son detalles.",
            "Tres adapters (memory/mysql/dynamodb): facilita demo local y sustentación sin reescribir casos de uso.",
            "MySQL local para desarrollo: índices (tenant_id, status) y (tenant_id, created_at) para volumen.",
            "DynamoDB en CDK: PK=tenantId / SK=id + GSIs por status y createdAt.",
            "Identidad simulada por selector de sesión: cumple el requisito sin inventar un IdP.",
            "SweetAlert2: feedback explícito en acciones de proceso para la demo.",
        ],
    )

    add_h(doc, "4. Qué hace infra (para explicar en vivo)")
    add_p(
        doc,
        "La carpeta infra es AWS CDK: describe el despliegue cloud. DynamoDB guarda "
        "las solicitudes por tenant; Fargate+ALB corre la API; S3+CloudFront publica "
        "el Angular. Se valida con cdk synth sin cuenta AWS. Localmente se usa "
        "docker-compose o MySQL; en cloud el adapter sería dynamodb.",
    )

    add_h(doc, "5. Alternativas descartadas")
    add_bullets(
        doc,
        [
            "Estados libres en controlador: rompería la invariante del proceso.",
            "Filtrar solo en frontend: inseguro ante llamadas directas a la API.",
            "Cargar 50k en el cliente: inviabiliza UX; se prefirió paginación server-side.",
            "SAM/Terraform: CDK mantiene TypeScript unificado con el resto del repo.",
        ],
    )

    add_h(doc, "6. Evidencia de calidad")
    add_bullets(
        doc,
        [
            "56 pruebas unitarias + 16 e2e (proceso, roles, aislamiento, listado).",
            "Lint/typecheck, build web y cdk synth validados.",
            "CI en GitHub Actions (lint, tests, build, synth) — archivo en .github/workflows.",
            "Docker Compose por perfiles para levantar el stack.",
        ],
    )

    add_h(doc, "7. Demo sugerida (60 minutos)")
    add_bullets(
        doc,
        [
            "1) Sesión filial: registrar solicitud → SweetAlert de éxito → aparece en REGISTRADA.",
            "2) Explicar “Sin acción para este rol” (filial no atiende; lo hace el analista).",
            "3) Sesión analista mismo tenant: Atender → Resolver → SweetAlert en cada paso.",
            "4) Volver a filial: Confirmar o Rechazar.",
            "5) Cambiar a otra filial y mostrar aislamiento (solo ve lo suyo / 404 opaco).",
            "6) Intentar transición inválida vía UI o API (mensaje 422).",
            "7) Explicar modelo de datos, adapters e infra CDK (synth).",
            "8) Cambio en vivo: por ejemplo, ajustar un mensaje SweetAlert o un filtro.",
        ],
    )

    add_h(doc, "8. Fuera de alcance (consciente)")
    add_bullets(
        doc,
        [
            "Proveedor de identidad real (OAuth/OIDC).",
            "Notificaciones por correo.",
            "Despliegue real a AWS (solo IaC validada con cdk synth).",
            "Búsqueda full-text avanzada en DynamoDB.",
        ],
    )

    add_h(doc, "9. Frases útiles para la defensa")
    add_bullets(
        doc,
        [
            "“La regla de negocio no depende de Nest ni de MySQL; el adapter solo persiste.”",
            "“Si un tenant intenta leer lo de otro, la respuesta es idéntica a un not found.”",
            "“El volumen se resuelve con paginación e índices, no cargando todo en memoria del cliente.”",
            "“Para la demo puedo cambiar PERSISTENCE_ADAPTER sin tocar casos de uso.”",
            "“Infra describe DynamoDB + Fargate + CloudFront; cdk synth prueba que el diseño es desplegable.”",
            "“Misma filial no implica mismas acciones: el rol define qué botón aparece.”",
        ],
    )

    path = out_dir / "02-explicacion-y-defensa.docx"
    doc.save(path)
    return path


if __name__ == "__main__":
    p1 = build_generalidades()
    p2 = build_defensa()
    print(p1)
    print(p2)
