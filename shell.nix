{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    (drogon.override { postgresSupport = true; })
    postgresql 

    cmake
    gcc
    ninja
    pkg-config
    jsoncpp
    libuuid
    zlib
    openssl
    sqlite
    libxcrypt
    nlohmann_json
    curl
  ];
}
