#pragma once
#include <curl/curl.h>

#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <nlohmann/json.hpp>
#include <thread>

void loadEnv(const std::string& filepath);
bool loadEnvFromProjectRoot();

std::string sendToTabScanner(const std::string& filePath);

std::string getTabScannerResult(const std::string& token);
