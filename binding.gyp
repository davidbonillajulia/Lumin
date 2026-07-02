{
  "targets": [
    {
      "target_name": "hap_decoder_addon",
      "sources": [ "electron/hap_decoder_addon.cpp" ],
      "include_dirs": [],
      "conditions": [
        [ "OS=='win'", {
          "libraries": [
            "-lmsvcrt.lib",
            "avformat.lib",
            "avcodec.lib",
            "avutil.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": [ "/std:c++17" ]
            }
          }
        }],
        [ "OS=='mac'", {
          "xcode_settings": {
            "CLANG_CXX_LIBRARY": "libc++",
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "MACOSX_DEPLOYMENT_TARGET": "10.15"
          },
          "libraries": [
            "-lavformat",
            "-lavcodec",
            "-lavutil"
          ]
        }],
        [ "OS=='linux'", {
          "cflags!": [ "-fno-exceptions" ],
          "cflags_cc!": [ "-fno-exceptions" ],
          "cflags_cc": [ "-std=c++17" ],
          "libraries": [
            "-lavformat",
            "-lavcodec",
            "-lavutil"
          ]
        }]
      ]
    }
  ]
}
