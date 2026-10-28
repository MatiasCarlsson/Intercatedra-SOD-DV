# Simulador de Cross-play (Sistemas Operativos Distribuidos)

Simulación web interactiva: PC, consola y móvil, con latencias distintas, compiten por el mismo ítem en un servidor autoritativo.

## Archivos
- `index.html`: estructura de la página y controles.
- `style.css`: estilos.
- `motor.js`: lógica de la simulación (sin DOM).
- `app.js`: interfaz, animación y estadísticas.
- `test-motor.js`: autotest opcional (`node test-motor.js`).
- `simulador-un-solo-archivo.html`: todo lo anterior en un único HTML, para Google Sites.

## Cómo usarlo
Abrir `index.html` en el navegador (doble clic). No necesita instalar nada ni conexión a internet.

## Cómo embeberlo en Google Sites
1. En Google Sites: **Insertar → Incorporar → Código para insertar (Embed code)**.
2. Abrir `simulador-un-solo-archivo.html` con un editor de texto, copiar todo y pegarlo.
3. Ajustar el tamaño del recuadro (conviene que sea alto, ~1500 px, o usar la página completa).

## Demo sugerida para el pitch
1. Modo **FIFO**, pulsar **⚡ Simular 1000 rondas**: la PC gana ~90 % y el móvil casi nunca.
2. Cambiar a **Ventana de equidad**, repetir: el reparto se acerca al 33 % cada uno.
3. Bajar la ventana a 0 ms y subirla de a poco: se ve el costo (más espera) frente al beneficio (más justicia).
