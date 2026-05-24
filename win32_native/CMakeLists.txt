cmake_minimum_required(VERSION 3.15)
project(LuminNativeWindowsCore CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Search for FFmpeg SDK in Windows system
find_package(FFmpeg REQUIRED COMPONENTS AVCODEC AVFORMAT AVUTIL)

add_library(lumin_core SHARED
    cpp_core/video_decoder.cpp
    cpp_core/render_engine.cpp
)

target_link_libraries(lumin_core PRIVATE 
    FFmpeg::avcodec 
    FFmpeg::avformat 
    FFmpeg::avutil 
    d3d12 
    dxgi
)
