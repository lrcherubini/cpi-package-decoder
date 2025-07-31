# SAP CPI Package Decoder 🔓

Una herramienta web para decodificar y visualizar el contenido de paquetes exportados desde SAP Cloud Platform Integration (CPI).

## 📋 Visión General

SAP CPI Package Decoder es una aplicación web que funciona completamente del lado del cliente, permitiendo a desarrolladores y administradores de SAP CPI inspeccionar paquetes de integración exportados, incluidos scripts, metadatos y recursos sin necesidad de herramientas externas.

## ✨ Funcionalidades
- **Decodificación automática**: Procesa archivos `.zip` exportados de SAP CPI
- **Visualización de metadatos**: Muestra información detallada del paquete (`contentmetadata.md`)
- **Exploración de recursos**: Lista y permite ver todos los recursos del paquete (`resources.cnt`)
- **Visualización de scripts**: Compatible con ScriptCollections y scripts individuales (Groovy, JavaScript, etc.)
- **Visualización de BPMN**: Botón para mostrar archivos `.iflw` como diagramas BPMN
- **Soporte para artefactos iFlow**: Permite cargar ZIPs exportados directamente de un iFlow
- **Interfaz intuitiva**: Arrastrar y soltar o selección de archivos
- **Procesamiento local**: Toda la decodificación ocurre en el navegador

## 🚀 Cómo Usar

1. **Exporta el paquete de SAP CPI**
   - En la interfaz web de SAP CPI ve a tu paquete de integración
   - Haz clic en "Actions" → "Export"
   - Descarga el archivo `.zip` resultante
   - También puedes exportar un iFlow individual (ZIP) y cargarlo

2. **Carga el archivo en la herramienta**
   - Abre `index.html` en tu navegador
   - Arrastra el archivo `.zip` al área de carga O
   - Haz clic en "Seleccionar Archivo ZIP" y elige el archivo

3. **Explora el contenido**
   - Visualiza los metadatos del paquete
   - Haz clic en cualquier recurso de la lista para ver su contenido
   - Los scripts y ScriptCollections se decodificarán automáticamente

## 📁 Estructura del Proyecto
```
sap-cpi-decoder/
├── index.html              # Página principal de la aplicación
├── css/
│   └── style.css           # Estilos de la interfaz
├── js/
│   ├── globals.js         # Variables y configuración general
│   ├── editor.js          # Funciones del editor Monaco
│   ├── fileLoader.js      # Procesamiento de ZIP y recursos
│   └── uiHandlers.js      # Eventos de la interfaz
├── lib/
│   └── jszip.min.js        # Biblioteca para manejar ZIP
├── .vscode/
│   └── launch.json         # Configuración de depuración para VS Code
├── .gitattributes          # Configuración de Git
└── README.md               # Esta documentación
```

## 🛠️ Tecnologías Utilizadas
- **HTML5**: Estructura de la aplicación
- **CSS3**: Interfaz moderna con gradientes y animaciones
- **JavaScript (ES6+)**: Lógica de procesamiento
- **JSZip**: Biblioteca para archivos ZIP
- **FileReader API**: Lectura de archivos locales
- **Base64 Decoding**: Decodificación de contenido

## 🔧 Configuración de Desarrollo

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Editor de código (recomendado: VS Code)

### Ejecución Local

1. **Clona o descarga el proyecto**
2. **Ábrelo en VS Code** (opcional)
3. **Ejecuta uno de los métodos**:
   - **Método 1**: Abre `index.html` directamente en el navegador
   - **Método 2**: Usa la extensión Live Server de VS Code
   - **Método 3**: Usa la configuración de depuración (F5 en VS Code)

### Depuración en VS Code

El proyecto incluye configuración de depuración (`.vscode/launch.json`):
- Presiona `F5` para iniciar la depuración
- O ve a **Run and Debug** → **Depurar en el Navegador**

## 📦 Archivos Procesados

La herramienta maneja los siguientes archivos del paquete SAP CPI:

| Archivo | Descripción | Formato |
|---------|-------------|---------|
| `contentmetadata.md` | Metadatos del paquete | Base64 → Text |
| `resources.cnt` | Lista de recursos | Base64 → JSON |
| `{resourceId}_content` | Contenido de los recursos | Binary/ZIP → Text/Scripts |
| `IFlow.zip` | Artefacto iFlow exportado | ZIP → Text/BPMN |

## 🔍 Tipos de Recursos Soportados
- **ScriptCollection**: Colecciones de scripts (ZIP interno)
- **Groovy Scripts**: Scripts Groovy individuales
- **JavaScript**: Scripts de JavaScript
- **XML**: Configuraciones y mapeos
- **Properties**: Archivos de propiedades
- **Otros**: Archivos de texto en general

## 🎨 Interfaz

La aplicación cuenta con una interfaz moderna y responsiva con:
- **Gradientes**: Diseño atractivo
- **Arrastrar y soltar**: Área de carga interactiva
- **Animaciones**: Retroalimentación visual suave
- **Responsiva**: Funciona en varios tamaños de pantalla
- **Resaltado de código**: Mejor legibilidad

## 🔒 Seguridad y Privacidad
- **Procesamiento local**: Ningún archivo se envía a servidores externos
- **Solo del lado del cliente**: Toda la decodificación ocurre en el navegador
- **Sin dependencias externas**: Solo librerías locales
- **Código abierto**: Totalmente auditable

## 🐛 Solución de Problemas

### El archivo no carga
- Verifica que sea un archivo `.zip` válido de SAP CPI
- Asegúrate de que el archivo no esté corrupto

### Error de decodificación
- Algunos recursos pueden no estar soportados
- Consulta la consola del navegador para más detalles

### La interfaz no carga
- Verifica que todos los archivos estén en la ubicación correcta
- Asegúrate de que JavaScript esté habilitado

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Para contribuir:

1. Haz un fork del proyecto
2. Crea una rama para tu funcionalidad (`git checkout -b feature/AmazingFeature`)
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Haz push de la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Changelog

### v1.0.0
- Funcionalidad inicial de decodificación
- Soporte para metadatos y recursos
- Interfaz de arrastrar y soltar
- Visualización de ScriptCollections

## 📄 Licencia

Este proyecto es de código abierto. Consulta el archivo LICENSE para más detalles.

## 🆘 Soporte

Para problemas o dudas:
- Abre una issue en el repositorio
- Consulta la documentación de SAP CPI
- Revisa la sección de solución de problemas arriba

## 🙏 Agradecimientos

- Comunidad open source por la biblioteca JSZip
- Desarrolladores que contribuyeron con comentarios y mejoras
