import sys
import time
import numpy as np
import av
import json
import threading
import http.server
import socketserver
from PySide6.QtCore import Qt, QThread, Signal, Slot, QRectF, QPointF, QMetaObject
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QGridLayout, QPushButton, QSlider, QLabel, QFrame, QStackedWidget,
    QOpenGLWidget, QFileDialog, QComboBox
)
from PySide6.QtGui import QImage, QPainter, QColor, QFont, QScreen, QGuiApplication

# --- BRIDGE API SERVER ---
class MonitorAPIHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return # Silenciar logs de consola para no ensuciar

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/monitors':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            screens = QGuiApplication.screens()
            monitor_list = []
            for i, screen in enumerate(screens):
                monitor_list.append({
                    "id": f"native-{i}",
                    "name": screen.name(),
                    "width": screen.geometry().width(),
                    "height": screen.geometry().height(),
                    "left": screen.geometry().x(),
                    "top": screen.geometry().y(),
                    "isPrimary": screen == QGuiApplication.primaryScreen()
                })
            self.wfile.write(json.dumps(monitor_list).encode())
        else:
            self.send_error(404)

def start_api_server():
    try:
        with socketserver.TCPServer(("", 3001), MonitorAPIHandler) as httpd:
            print("Lumina Native Bridge running on port 3001")
            httpd.serve_forever()
    except Exception as e:
        print(f"Error starting API server: {e}")

# --- VENTANA DE SALIDA FULLSCREEN ---
class FullscreenOutput(QMainWindow):
    closed = Signal()
    def __init__(self, screen_index=0):
        super().__init__()
        self.setWindowTitle(f"Lumina Output - Screen {screen_index}")
        self.canvas = LiveCanvas()
        self.setCentralWidget(self.canvas)
        self.setStyleSheet("background-color: black;")
        # Sin bordes para fullscreen real
        self.setWindowFlags(Qt.Window | Qt.FramelessWindowHint)

    def closeEvent(self, event):
        self.closed.emit()
        super().closeEvent(event)

    def set_frame(self, image):
        self.canvas.set_frame(image)

# --- MOTOR DE VIDEO (VideoEngine) ---
# Se ejecuta en un hilo separado para no bloquear la interfaz de usuario.
class VideoEngine(QThread):
    frame_ready = Signal(QImage)

    def __init__(self, file_path=None):
        super().__init__()
        self.file_path = file_path
        self.running = False
        self.opacity = 1.0
        self.scale = 1.0
        self.position = QPointF(0, 0)

    def run(self):
        if not self.file_path:
            return

        self.running = True
        try:
            container = av.open(self.file_path)
            stream = container.streams.video[0]
            
            # Loop de reproducción
            while self.running:
                for frame in container.decode(video=0):
                    if not self.running:
                        break
                    
                    # Convertir frame de FFmpeg a formato QImage (con soporte Alpha si existe)
                    # Para este boilerplate usamos RGB24 para simplicidad
                    img_data = frame.to_ndarray(format='rgb24')
                    height, width, channel = img_data.shape
                    bytes_per_line = channel * width
                    
                    q_img = QImage(img_data.data, width, height, bytes_per_line, QImage.Format_RGB888)
                    
                    # Emitir señal con el nuevo frame
                    self.frame_ready.emit(q_img.copy())
                    
                    # Control de velocidad (basado en el framerate del video)
                    time.sleep(1 / float(stream.average_rate))
                
                # Reiniciar video al final (Loop)
                container.seek(0)
        except Exception as e:
            print(f"Error en VideoEngine: {e}")

    def stop(self):
        self.running = False
        self.wait()

# --- RENDERIZADOR OPENGL (LiveCanvas) ---
class LiveCanvas(QOpenGLWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_frame = None
        self.opacity = 1.0

    def set_frame(self, image):
        self.current_frame = image
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        # Dibujar fondo oscuro
        painter.fillRect(self.rect(), QColor(10, 10, 10))
        
        if self.current_frame:
            # Aplicar opacidad
            painter.setOpacity(self.opacity)
            
            # Dibujar el frame escalado al widget manteniendo proporción
            target_rect = self.current_frame.rect().scaled(self.rect().size(), Qt.KeepAspectRatio)
            target_rect.moveCenter(self.rect().center())
            painter.drawImage(target_rect, self.current_frame)
        
        painter.end()

# --- INTERFAZ PRINCIPAL (MainWindow) ---
class LuminaDesktop(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Lumina Media Server - Pro Desktop Boilerplate")
        self.resize(1280, 800)
        self.setStyleSheet("background-color: #050505; color: #e0e0e0;")
        
        self.engines = {} # Diccionario de motores activos
        
        self.output_window = None # Ventana secundaria
        self.init_ui()

    def refresh_screens(self):
        self.screen_selector.clear()
        screens = QGuiApplication.screens()
        for i, screen in enumerate(screens):
            self.screen_selector.addItem(f"Monitor {i}: {screen.name()} ({screen.geometry().width()}x{screen.geometry().height()})")

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        
        # --- WORKSPACE IZQUIERDO ---
        workspace_layout = QVBoxLayout()
        main_layout.addLayout(workspace_layout, 4)
        
        # 1. ZONA SUPERIOR: LIVE CANVAS (A/B MONITORS)
        canvas_layout = QHBoxLayout()
        self.monitor_a = LiveCanvas()
        self.monitor_b = LiveCanvas()
        
        crossfader_layout = QVBoxLayout()
        self.crossfader = QSlider(Qt.Vertical)
        self.crossfader.setRange(0, 100)
        self.crossfader.setValue(50)
        self.crossfader.setStyleSheet("QSlider::handle:vertical { background: #f97316; height: 20px; }")
        self.crossfader.valueChanged.connect(self.on_crossfade)
        
        crossfader_layout.addWidget(QLabel("X-FADE"))
        crossfader_layout.addWidget(self.crossfader)
        
        canvas_layout.addWidget(self.monitor_a, 2)
        canvas_layout.addLayout(crossfader_layout, 0)
        canvas_layout.addWidget(self.monitor_b, 2)
        
        workspace_layout.addLayout(canvas_layout, 2)
        
        # 2. ZONA CENTRAL: DYNAMIC INSPECTOR
        self.inspector_frame = QFrame()
        self.inspector_frame.setFixedHeight(200)
        self.inspector_frame.setStyleSheet("background-color: #000; border-top: 1px solid #1a1a1a;")
        inspector_layout = QHBoxLayout(self.inspector_frame)
        
        # Sliders visuales para transformación
        transform_group = QVBoxLayout()
        transform_group.addWidget(QLabel("TRANSFORM"))
        
        self.scale_slider = QSlider(Qt.Horizontal)
        self.scale_slider.setRange(10, 300)
        self.scale_slider.setValue(100)
        transform_group.addWidget(QLabel("SCALE"))
        transform_group.addWidget(self.scale_slider)
        
        self.opacity_slider = QSlider(Qt.Horizontal)
        self.opacity_slider.setRange(0, 100)
        self.opacity_slider.setValue(100)
        transform_group.addWidget(QLabel("OPACITY"))
        transform_group.addWidget(self.opacity_slider)
        
        inspector_layout.addLayout(transform_group)
        workspace_layout.addWidget(self.inspector_frame)

        # 3. ZONA INFERIOR: THE GRID (DECK)
        self.deck_frame = QFrame()
        self.deck_frame.setFrameShape(QFrame.StyledPanel)
        self.deck_frame.setStyleSheet("background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 5px;")
        deck_layout = QVBoxLayout(self.deck_frame)
        deck_layout.addWidget(QLabel("THE GRID / DECK"))
        
        grid_container = QGridLayout()
        for i in range(12):
            btn = QPushButton(f"CLIP {i+1}")
            btn.setFixedSize(100, 60)
            btn.setStyleSheet("background-color: #151515; border: 1px solid #222; font-weight: bold;")
            btn.clicked.connect(lambda checked, idx=i: self.load_clip(idx))
            grid_container.addWidget(btn, i // 6, i % 6)
        
        deck_layout.addLayout(grid_container)
        workspace_layout.addWidget(self.deck_frame, 1)
        
        # --- ZONA LATERAL: OUTPUT MASTER ---
        output_layout = QVBoxLayout()
        main_layout.addLayout(output_layout, 1)
        
        output_layout.addWidget(QLabel("OUTPUT MASTER"))
        
        self.screen_selector = QComboBox()
        self.refresh_screens()
        output_layout.addWidget(QLabel("SELECT MONITOR:"))
        output_layout.addWidget(self.screen_selector)
        
        self.btn_out1 = QPushButton("LAUNCH FULLSCREEN")
        self.btn_out1.setCheckable(True)
        self.btn_out1.setStyleSheet("QPushButton:checked { background-color: #f97316; color: black; }")
        self.btn_out1.clicked.connect(self.toggle_fullscreen)
        
        self.btn_ndi = QPushButton("NDI STREAM")
        self.btn_ndi.setCheckable(True)
        
        output_layout.addWidget(self.btn_out1)
        output_layout.addWidget(self.btn_ndi)
        output_layout.addStretch()

    def toggle_fullscreen(self, checked):
        if checked:
            screen_idx = self.screen_selector.currentIndex()
            screens = QGuiApplication.screens()
            if screen_idx < len(screens):
                target_screen = screens[screen_idx]
                self.output_window = FullscreenOutput(screen_idx)
                
                # Mover a la pantalla seleccionada
                self.output_window.setGeometry(target_screen.geometry())
                self.output_window.showFullScreen()
                self.output_window.closed.connect(lambda: self.btn_out1.setChecked(False))
                
                # Conectar motores activos a la nueva ventana
                for engine in self.engines.values():
                    engine.frame_ready.connect(self.output_window.set_frame)
        else:
            if self.output_window:
                self.output_window.close()
                self.output_window = None

    def load_clip(self, idx):
        file_path, _ = QFileDialog.getOpenFileName(self, "Cargar Video", "", "Videos (*.mp4 *.mov *.mkv)")
        if file_path:
            # Detener motor anterior si existe
            if idx in self.engines:
                self.engines[idx].stop()
            
            # Crear nuevo motor de video
            engine = VideoEngine(file_path)
            # Conectar señal de frame al monitor A (Preview)
            engine.frame_ready.connect(self.monitor_a.set_frame)
            
            # Conectar a la ventana de salida si está activa
            if self.output_window:
                engine.frame_ready.connect(self.output_window.set_frame)
                
            engine.start()
            self.engines[idx] = engine

    def on_crossfade(self, value):
        # Lógica de mezcla A/B
        opacity_a = (100 - value) / 100.0
        opacity_b = value / 100.0
        self.monitor_a.opacity = opacity_a
        self.monitor_b.opacity = opacity_b
        self.monitor_a.update()
        self.monitor_b.update()

if __name__ == "__main__":
    # Start API Bridge in a background thread
    threading.Thread(target=start_api_server, daemon=True).start()

    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    
    window = LuminaDesktop()
    window.show()
    
    sys.exit(app.exec())
