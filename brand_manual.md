Este documento es la ley absoluta para la coherencia visual y operativa de Southmarine Trading. Como **Brand Manual Guardian**, mi misión es asegurar que cada pixel sirva a la claridad y la eficiencia.

---

## 🖤 Estética General: "Carajo Dark Premium"
Esta plataforma es una **herramienta operativa de alto rendimiento**, no una página de marketing. Priorizamos la **claridad radical** y la **baja fricción cognitiva**.

### 🎨 Paleta de Colores (Estricta)
| Elemento | Variable CSS | Color Hex | Uso |
| :--- | :--- | :--- | :--- |
| **Fondo Base** | `--bg` | `#0b1120` | Fondo principal (Azul marino) |
| **Superficie** | `--surface` | `#161d2f` | Tarjetas y contenedores primarios |
| **Elevación** | `--surface-raised` | `#1e293b` | Elementos interactivos, headers, inputs |
| **Acento** | `--accent` | `#38bdf8` | Celeste Southmarine - Foco y Branding |
| **Éxito** | `--green` | `#22c55e` | Cobros, estados OK, balances positivos |
| **Alerta** | `--amber` | `#f59e0b` | Pendientes, advertencias |
| **Error/Peligro** | `--red` | `#ef4444` | Deudas, balances negativos, errores |
| **Texto Principal** | `--text` | `#ececee` | Casi blanco (90% contraste) |
| **Texto Muted** | `--text-muted` | `#94a3b8` | Descripciones, labels secundarios |
| **Texto Dim** | `--text-dim` | `#4a5b73` | UI inactiva, placeholders, headers de tabla |

---

## 📐 Reglas de UI/UX y Densidad

### 1. Jerarquía Tipográfica (Standard)
*   **H1 (Page Titles):** 24px (`var(--font-size-2xl)`), Weight 800, Letter-spacing -0.7px.
*   **H2 (Card Titles):** 16px (`var(--font-size-base)`), Weight 600.
*   **Subtitles/Context:** 12px (`var(--font-size-sm)`), Color: `var(--text-muted)`.
*   **Cuerpo:** 14px (`var(--font-size-base)`), Weight 400.
*   **Monospace:** JetBrains Mono para montos, IDs y fechas.

### 2. Densidad y Espaciado (Regla de 4px)
*   **Gap General:** Mínimo `var(--space-4)` (16px) entre componentes.
*   **Padding Interno (Cards):** `var(--space-6)` (24px).
*   **Padding Interno (Compacto):** `var(--space-4)` (16px).
*   **Prohibición:** No usar paddings/margins arbitrarios (e.g. 15px, 21px). Usar siempre variables `--space-*`.

### 3. Redondeo (Radios)
*   **Large (`var(--radius-lg)` - 12px):** Para la App Shell, Sidebar y Cards principales.
*   **Medium (`var(--radius-md)` - 8px):** Para Botones, Inputs y Modales internos.
*   **Small (`var(--radius-sm)` - 4px):** Para Badges y Tabs.

---

## 🤖 Persona y Gobernanza

### Tono de Voz
*   **Identidad:** "Inteligencia Operativa Southmarine".
*   **Estilo:** Directo, eficiente, con micro-toques de humor premium.
*   **Uso de Emojis:** Máximo 1 por sentencia importante (💎, 🚀, 🚢, ✨).

### Dark Mode / Light Mode
*   La plataforma soporta tanto **Dark Mode** (default) como **Light Mode**. 
*   Light Mode is designed for high clarity in bright environments but maintains the same premium aesthetic and operational efficiency.

---

## 🚫 Prohibiciones ("The Guardian Says No")
1.  **Fuga de Estilos:** No usar `style={{ ... }}` para layout si existen clases CSS disponibles.
2.  **Sombras Blandas:** Evitar sombras proyectadas excesivas. Preferir bordes sutiles (`1px solid var(--border)`).
3.  **Colores fuera de paleta:** No inventar tonos de azul o gris. Usar las variables.

---

## 📊 Estándar de Tablas (Table Standard)

Todas las tablas de la app siguen estas reglas de forma **estricta y uniforme**.

### Estructura CSS
| Elemento | Regla |
| :--- | :--- |
| `table` | `width: 100%`, `border-collapse: collapse`, `font-size: 13px`, `minWidth: 600px` |
| `thead th` | `padding: 10px 14px`, `font-size: 10px`, `font-weight: 700`, `color: var(--text-dim)`, `text-transform: uppercase`, `letter-spacing: 0.06em`, `background: var(--surface-raised)`, `border-bottom: 1px solid var(--border)` |
| `tbody td` | `padding: 12px 14px`, `border-bottom: 1px solid var(--border)`, `vertical-align: middle` |
| `tbody td` (compacto) | `padding: 9px 12px` — solo cuando el espacio es crítico |
| `tr:last-child td` | `border-bottom: none` |
| `tr:hover td` | `background: rgba(56,189,248,0.03)`, `transition: background 0.12s` |
| Layout Entidades | **Importador:** arriba, color primario. **Exportador:** abajo, más chico, en `var(--text-muted)`. |

### Tipografía en tabla
- **Datos primarios:** 13px, `var(--text)`, font-weight 600
- **Datos secundarios:** 12px, `var(--text-muted)`, font-weight 400
- **IDs / montos / fechas:** `font-family: var(--font-mono)`
- **Columna de acciones:** ancho fijo `36–40px`, botones icon-only

### Columna OP ID (Primera Columna — Estándar)
- **Header:** siempre `OP ID` (no "Referencia", "ID Operación", "N Operacion", etc.)
- **Valor:** `font-family: var(--font-mono)`, `font-size: 13px`, `font-weight: 700`, `color: #ffffff` (blanco puro)
- **Sin pills ni badges** de color. Texto plano blanco.
- **Estilo de referencia:** igual a la columna "Referencia" de Central Documental.

---

> [!IMPORTANT]
> **Consistencia > Estética.** Un diseño consistente es más eficiente que uno "bonito" pero arbitrario. Cada cambio debe pasar por la evaluación del Manual.
