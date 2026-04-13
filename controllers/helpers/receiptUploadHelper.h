#pragma once
#include <curl/curl.h>

#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <nlohmann/json.hpp>
#include <thread>

std::string sendToTabScanner(const std::string& filePath);

std::string getTabScannerResult(const std::string& token);
