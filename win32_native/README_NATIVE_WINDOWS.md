# LUMIN PRESENTATION PRO - INTEGRACIÓN Y COMPILACIÓN NATIVA WINDOWS 10/11

Este directorio contiene todo el código fuente del motor nativo desacoplado en **C++ y Rust**.
Al clonar u exportar el repositorio de GitHub en Windows, tendrás todo listo para compilar tu aplicación de escritorio profesional con aceleración nativa por hardware GPU (NVDEC CUDA / DirectX 12).

---

## 1. REQUISITOS DEL ENTORNO EN WINDOWS
Para compilar y empaquetar el ejecutable nativo `.exe`, asegúrate de tener instalado en tu máquina Windows:

1. **Node.js** (v18 o superior)
2. **Git** (Para clonar/gestionar vuestro repositorio)
3. **Rust Toolchain** (Instalador rustup desde https://rustup.rs/)
4. **Visual Studio 2022** con la carga de trabajo:
   - *Desarrollo para el escritorio con C++*
   - *SDK de Windows 10 o 11*
5. **CMake** (v3.15 o superior, opcional para compilar el módulo C++ independiente)

---

## 2. INSTRUCCIONES DE INSTALACIÓN Y CONSTRUCCIÓN

Una vez exportado el repositorio, abre PowerShell o CMD en la raíz de tu proyecto LUMIN y realiza los siguientes pasos:

### Paso A: Instalar dependencias de Node.js
```bash
npm install
```
Esto instalará `electron`, `electron-builder` y todas las utilidades de interfaz necesarias.

### Paso B: Ejecutar la aplicación en modo desarrollo (Hot-Reload)
```bash
npm run dev:electron
```
Este comando cargará simultáneamente el entorno de desarrollo Vite de baja latencia y el contenedor Electron con bypass de GPU habilitados.

### Paso C: Empaquetar el Instalador Autónomo (.exe)
Para generar el `.exe` compilado y listo para instalar en Windows 10/11 con optimización multihilo y bypass de decodificación:
```bash
npm run build:exe
```
El instalador con marca se creará en la carpeta `./release` o `./dist_electron` según la configuración.

---

## 3. INTEGRACIÓN DEL CO-PROCESADOR DE VÍDEO NATIVO (C++ / Rust)

Para conectar el motor nativo de C++/Rust y saltar por completo el render del navegador Chromium (ideal para video-walls e instalaciones masivas de ultra-alto rendimiento):

1. **Compilar el núcleo nativo**:
   ```bash
   cd win32_native
   cargo build --release
   ```
2. **Efecto de Bypass**: El archivo binario resultante se comunica directamente con las llamadas de hardware que se muestran en la sección **"Rendimiento y Motor Nativo"** de la interfaz LUMIN, garantizando que el pipeline de decodificación CUDA e interfaz DirectX 12 Swapchain respondan con latencia cercana a 0ms.
