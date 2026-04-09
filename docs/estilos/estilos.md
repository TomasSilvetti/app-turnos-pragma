Sistema de Diseño — App Concesionaria
Colores (CSS Variables)
Token	Valor	Uso
--background	#ffffff	Fondo de cards y tablas
--foreground	#2A2829	Texto general
--color-surface	#F4F5F7	Fondo de página (detrás de cards)
--color-primary	#253551	Botones principales, headers de tabla
--color-primary-hover	#1c2a40	Hover de primario
--color-secondary	#2A2829	Acciones secundarias
--color-muted	#E0E0DB	Fondos suaves, disabled, bordes
--color-danger	#ef4444	Errores, eliminaciones
--color-success	#22c55e	Confirmaciones, estados ok
--color-border	#E0E0DB	Bordes globales
El azul de Tailwind (blue-*) está remapeado a una paleta navy centrada en #253551.

Tipografía (Google Fonts)
Variable	Fuente	Uso
--font-heading	Archivo Black (weight 400)	H1–H3, títulos de sección
--font-body	Space Grotesk (300–700)	Texto general, body
--font-small	Geist Mono	Captions, etiquetas, código
El font-size base del html está fijado en 13px (más compacto que el estándar de 16px).

Iconos
Material Symbols Outlined — cargados via material-symbols/outlined.css con preload del .woff2. Se usan como texto: <span className="material-symbols-outlined">search</span>
Lucide React — íconos SVG como componentes React para elementos de UI
Componentes UI
shadcn/ui + Radix UI como primitivos
Las clases de Tailwind disponibles desde el sistema de diseño son: bg-primary, text-primary, bg-danger, bg-success, bg-muted, bg-surface, font-heading, font-body, font-small
Patrón de Card global

background: #ffffff;
border: 1px solid #E0E0DB;
border-radius: 0.5rem;  /* rounded-lg */
padding: 1.25rem;        /* p-5 */
Tablas
Header: fondo #253551 (primary), texto blanco, uppercase, font-size: 0.75rem, letter-spacing: 0.05em
Filas: hover con #eef1f6 (blue-50), separadas por border-bottom