// render_engine.cpp
// Presentador gráfico desacoplado del navegador usando DirectX 12 direct swapchain
#include <d3d12.h>
#include <dxgi1_4.h>
#include <iostream>

class Direct3DRenderEngine {
private:
    ID3D12Device* device = nullptr;
    IDXGISwapChain3* swap_chain = nullptr;
    ID3D12CommandQueue* command_queue = nullptr;
    ID3D12CommandAllocator* command_allocator = nullptr;

public:
    bool init_rendering_swapchain(HWND hwnd, int width, int height) {
        // Acceso directo a dispositivos físicos de hardware y VRAM virtual
        HRESULT hr = D3D12CreateDevice(NULL, D3D_FEATURE_LEVEL_12_0, IID_PPV_ARGS(&device));
        if (FAILED(hr)) {
            std::cerr << "Error al inicializar dispositivo físico D3D12" << std::endl;
            return false;
        }

        D3D12_COMMAND_QUEUE_DESC queue_desc = {};
        queue_desc.Type = D3D12_COMMAND_LIST_TYPE_DIRECT;
        device->CreateCommandQueue(&queue_desc, IID_PPV_ARGS(&command_queue));

        // Configuración de Buffer Triple con conmutación estricta para latencia cero
        DXGI_SWAP_CHAIN_DESC1 sd = {};
        sd.Width = width;
        sd.Height = height;
        sd.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
        sd.BufferCount = 3; 
        sd.SwapEffect = DXGI_SWAP_EFFECT_FLIP_DISCARD;
        sd.SampleDesc.Count = 1;

        IDXGIFactory4* factory = nullptr;
        CreateDXGIFactory1(IID_PPV_ARGS(&factory));
        
        IDXGISwapChain1* temp_swap = nullptr;
        factory->CreateSwapChainForHwnd(command_queue, hwnd, &sd, NULL, NULL, &temp_swap);
        temp_swap->QueryInterface(IID_PPV_ARGS(&swap_chain));
        
        std::cout << "[D3D12] Direct Swapchain link acoplado a HWND activo" << std::endl;
        return true;
    }
};
