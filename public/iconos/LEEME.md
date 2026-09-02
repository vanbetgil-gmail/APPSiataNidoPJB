# Íconos de NIDO PJB

Generados automáticamente desde `LogoActual.png` con:

```
uv run --with pillow python scripts/generar-iconos.py
```

| Archivo | Tamaño | Uso |
|---|---|---|
| `icono-192.png` | 192×192 | Pantalla de inicio del celular |
| `icono-512.png` | 512×512 | Pantalla de bienvenida al abrir |
| `icono-maskable-512.png` | 512×512 | Android, con margen de seguridad del 20 % |

El script recorta el ave del logo —el elemento reconocible de la marca
(FR-002)— y descarta el texto y la barra cromática. El recorte se calcula, no
está codificado a mano, así que sigue funcionando si el logo se retoca.

**El ícono no debe cambiarse a la ligera**: la gente reconoce su acceso directo
por el dibujo, y sustituirlo se percibe como si fuera otra aplicación.
